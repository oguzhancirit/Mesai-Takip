(function(){
  "use strict";
  const rules=window.MesaiNotificationRules;
  function create({getSnapshot,onOpen}){
    const config=window.MesaiNotificationsConfig||{};
    const KEY=config.testMode?"mesaiTakip:notifications:phoneTest:v1":"mesaiTakip:notifications:v1";
    const el=id=>document.getElementById(id),api=(config.available===false?"":config.api||"").replace(/\/$/,"");
    const defaults={...rules.defaults,enabled:false};
    let prefs={...defaults},token=null,seq=0,pending=null,timer=0,busy=false,storageOK=true,message="";
    try{const raw=localStorage.getItem(KEY);if(raw){const old=JSON.parse(raw);token=old.token;seq=Number.isSafeInteger(old.seq)?old.seq:0;pending=old.pending&&old.pending.seq===seq?old.pending:null;for(const k in defaults)if(typeof old.prefs?.[k]===typeof defaults[k])prefs[k]=old.prefs[k];}}
    catch{storageOK=false;message="Bildirim ayarları okunamadı. Mesai kayıtların etkilenmedi.";}
    const supported=()=>window.isSecureContext&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
    function save(){try{localStorage.setItem(KEY,JSON.stringify({prefs,token,seq,pending}));return true;}catch{storageOK=false;message="Bildirim ayarları kaydedilemedi. Mesai takibi çalışmaya devam ediyor.";return false;}}
    function show(){
      if(!el("notifyStatus"))return;
      const permission="Notification" in window?Notification.permission:"unsupported";
      el("notifyStatus").textContent=message||(!api?(config.available===false?"Bildirim servisi kullanıcı erişimi onayı bekliyor.":"Bildirim servisi kurulum bekliyor."):!supported()?"Bu tarayıcıda bildirim desteği yok. iPhone’da uygulamayı Ana Ekran simgesinden aç.":permission==="denied"?"Bildirim izni kapalı. Telefon ayarlarından açabilirsin.":prefs.enabled&&permission==="granted"?"Bildirimler açık. Saatler Türkiye saatidir.":"Bildirimler kapalı.");
      el("notifyEnable").disabled=!api||!supported()||!storageOK||busy;
      el("notifyEnable").textContent=prefs.enabled?"Bildirimleri kapat":"Bildirimleri etkinleştir";
      el("notifyTest").disabled=!api||!prefs.enabled||permission!=="granted"||busy;
      for(const name of ["break","exit","entry","weekly","canias"]){el("notify-"+name).checked=prefs[name];el("notify-"+name).disabled=busy;}
      if(config.testMode)for(const name of ["break","exit","entry","weekly","canias"]){const button=el("notify-sample-"+name);if(button)button.disabled=!prefs.enabled||permission!=="granted"||busy;}
    }
    async function request(path,body,method="POST"){
      const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),10000);
      try{const r=await fetch(api+path,{method,headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(body),signal:ctrl.signal,cache:"no-store",credentials:"omit"});if(!r.ok)throw new Error("Servis yanıtı "+r.status);return await r.json();}finally{clearTimeout(timeout);}
    }
    function schedule(){
      if(!prefs.enabled||!token||!api)return;
      // Attendance is read, never written by the notification module.
      const snapshot=getSnapshot();
      pending={seq:++seq,prefs:{...prefs},snapshot};save();
      clearTimeout(timer);timer=setTimeout(flush,300);
    }
    async function flush(){
      if(busy||!pending||!api||!token)return;
      busy=true;const sent=pending;show();
      try{sent.snapshot=getSnapshot();await request("/device",sent,"PUT");if(pending?.seq===sent.seq){pending=null;save();}message="";}
      catch{message="Bildirim servisine ulaşılamadı. Mesai kayıtların cihazında korunuyor; bağlantıda tekrar denenecek.";}
      finally{busy=false;show();if(pending&&pending.seq!==sent.seq)timer=setTimeout(flush,300);}
    }
    function keyBytes(value){const s=atob(value.replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(s,c=>c.charCodeAt(0));}
    async function enable(){
      if(busy||!api||!supported()||!storageOK)return;
      if(prefs.enabled){
        prefs.enabled=false;const disabled={seq:++seq,prefs:{...prefs},snapshot:getSnapshot()};pending=disabled;save();show();
        busy=true;
        try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe();await request("/device",disabled,"PUT");pending=null;save();message="Bildirimler kapatıldı.";}
        catch{message="Bildirimler cihazda kapatıldı. Servis bağlantısı yenilenince ayar iletilecek.";}
        finally{busy=false;show();}return;
      }
      // Permission is requested directly from the user's tap, before network work.
      const permissionPromise=Notification.requestPermission();busy=true;show();let subscribed=null;
      try{
        const permission=await permissionPromise;if(permission!=="granted"){message="Bildirim izni verilmedi. Mesai takibi etkilenmedi.";return;}
        const configResponse=await fetch(api+"/config",{cache:"no-store",credentials:"omit"});if(!configResponse.ok)throw Error("config");const config=await configResponse.json();
        const reg=await navigator.serviceWorker.ready;
        const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(config.publicKey)});subscribed=sub;
        if(!token)token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
        // Persist the subscription identity before enrolling it remotely.
        if(!save())throw Error("storage");
        const snapshot=getSnapshot(),next={...prefs,enabled:true},body={seq:++seq,prefs:next,snapshot,subscription:sub.toJSON()};
        await request("/device",body,"PUT");prefs=next;pending=null;save();message="Bildirimler etkinleştirildi. Test bildirimi gönderebilirsin.";
      }catch{
        // A timed-out enrollment may have reached the server: queue a newer disabled state.
        prefs.enabled=false;
        if(token){pending={seq:++seq,prefs:{...prefs},snapshot:getSnapshot()};save();}
        if(subscribed){try{await subscribed.unsubscribe();}catch{}}
        message="Bildirimler etkinleştirilemedi. Mesai kayıtların korunuyor; tekrar deneyebilirsin.";
      }
      finally{busy=false;show();}
    }
    async function test(){
      if(busy||!prefs.enabled)return;busy=true;show();
      try{await request("/test",{});message="Test bildirimi gönderim servisine iletildi. Telefonunda görünmesini kontrol et.";}
      catch{message="Test bildirimi gönderilemedi. Mesai takibi etkilenmedi.";}
      finally{busy=false;show();}
    }
    async function sample(scenario){
      if(!config.testMode||busy||!prefs.enabled)return;busy=true;show();
      try{await request("/test-later",{scenario});message="Örnek bildirim bir dakika sonrası için planlandı. Şimdi uygulamayı kapatıp bekleyebilirsin.";}
      catch{message="Test planlanamadı. Yeni bir örnek için bir dakika bekleyip tekrar dene.";}
      finally{busy=false;show();}
    }
    el("notifyEnable").addEventListener("click",enable);el("notifyTest").addEventListener("click",test);
    for(const name of ["break","exit","entry","weekly","canias"])el("notify-"+name).addEventListener("change",e=>{prefs[name]=e.target.checked;save();schedule();show();});
    if(config.testMode)for(const name of ["break","exit","entry","weekly","canias"])el("notify-sample-"+name)?.addEventListener("click",()=>sample(name));
    window.addEventListener("online",flush);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden){show();schedule();if(!prefs.enabled&&pending)flush();}});
    navigator.serviceWorker?.addEventListener("message",e=>{if(e.data?.type==="mesai-open")onOpen(e.data.tab);});
    const requested=new URLSearchParams(location.search).get("notification");if(["today","notes","sum"].includes(requested))onOpen(requested);
    show();schedule();if(!prefs.enabled&&pending)flush();
    // One best-effort retry; no background timer is claimed to run while the app is closed.
    setInterval(()=>{if(!document.hidden&&pending)flush();},60000);
    return {schedule,show};
  }
  window.MesaiNotifications={create};
})();

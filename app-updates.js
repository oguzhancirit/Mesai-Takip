(function(){
  'use strict';
  const VERSION='2026.10.12.3';
  function start({canReload=()=>true}={}){
    const el=id=>document.getElementById(id),sw=navigator.serviceWorker;
    if(!sw||location.protocol!=='https:')return;
    let registration=null,applying=false,reloadReady=false,reloaded=false,lastCheck=0,checking=false,hasController=!!sw.controller;
    const banner=el('appUpdateBanner'),button=el('appUpdateApply'),status=el('appUpdateStatus'),check=el('appUpdateCheck');
    if(!banner||!button)return;
    const say=message=>{if(status)status.textContent=message;};
    function offer(){banner.hidden=false;button.disabled=false;button.textContent='Güncelle';}
    function watch(worker){if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&sw.controller)offer();if(worker.state==='redundant')say('Güncelleme indirilemedi. Daha sonra tekrar kontrol edebilirsin.');});}
    function reload(){if(reloaded)return;reloaded=true;location.reload();}
    async function inspect(force=false){
      if(checking||!registration||document.hidden||navigator.onLine===false||(!force&&Date.now()-lastCheck<300000))return;
      checking=true;lastCheck=Date.now();if(check)check.disabled=true;
      try{await registration.update();if(registration.waiting){offer();say('Yeni sürüm hazır. Güncelle düğmesine basabilirsin.');}else if(!registration.installing)say('Güncelleme kontrol edildi. Yeni sürüm hazır olduğunda burada görünecek.');}
      catch{say('Güncelleme kontrol edilemedi. Bağlantı geldiğinde tekrar denenecek.');}
      finally{checking=false;if(check)check.disabled=false;}
    }
    button.addEventListener('click',()=>{
      if(applying)return;
      if(!canReload()){say('Önce açık düzenleme ekranını kapat veya saat değişikliğini tamamla. Sonra Güncelle’ye bas.');el('appUpdateText').textContent='Önce açık düzenlemeyi tamamla; kayıtların korunacak.';return;}
      if(reloadReady){reload();return;}
      if(!registration?.waiting){inspect(true);return;}
      applying=true;button.disabled=true;button.textContent='Güncelleniyor…';
      try{registration.waiting.postMessage({type:'MESAI_SKIP_WAITING'});}catch{applying=false;button.disabled=false;say('Güncelleme başlatılamadı. Tekrar deneyebilirsin.');}
    });
    sw.addEventListener('controllerchange',()=>{
      if(!hasController&&!applying){hasController=true;return;}
      if(applying){reload();return;}
      // Another tab can activate a release; leave this tab's unfinished form untouched.
      if(registration){reloadReady=true;offer();}
    });
    if(check)check.addEventListener('click',()=>inspect(true));
    if(el('appVersion'))el('appVersion').textContent='Sürüm '+VERSION;
    if(check)check.disabled=true;
    sw.register('sw.js',{updateViaCache:'none'}).then(reg=>{
      registration=reg;lastCheck=Date.now();if(check)check.disabled=false;
      if(reg.waiting&&sw.controller)offer();watch(reg.installing);
      reg.addEventListener('updatefound',()=>watch(reg.installing));
      say(reg.waiting?'Yeni sürüm hazır. Güncelle düğmesine basabilirsin.':'Yeni sürümler otomatik kontrol edilir. Kayıtların cihazında kalır.');
    }).catch(()=>say('Güncelleme kontrolü şu an başlatılamadı. Mesai takibi çalışmaya devam ediyor.'));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)inspect();});
    window.addEventListener('online',()=>inspect());
    setInterval(()=>{if(!document.hidden)inspect();},300000);
    return {check:()=>inspect(true)};
  }
  window.MesaiAppUpdates={start,version:VERSION};
})();

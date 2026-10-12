(function(root){
  "use strict";
  const MIN=60000, DAY=86400000;
  const defaults={break:true,exit:true,entry:true,weekly:true,canias:true,goal:false,missing:false,entryMinute:510,exitMinute:1110};
  function day(ms){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(ms);}
  const at=(k,m)=>Date.parse(k+"T00:00:00+03:00")+m*MIN;
  const dow=k=>new Date(at(k,720)).getUTCDay();
  const monday=k=>day(at(k,720)-((dow(k)+6)%7)*DAY);
  const signed=m=>(m>0?"+":m<0?"−":"")+(Math.abs(m)>=60?Math.floor(Math.abs(m)/60)+" sa"+(Math.abs(m)%60?" "+Math.abs(m)%60+" dk":""):Math.abs(m)+" dk");
  function due(s,p,now){
    if(!s||!p||!p.enabled)return [];
    const k=day(now),wd=dow(k),week=monday(k),out=[];
    const add=(kind,tag,time,expiry,title,body)=>{if(now>=time&&now<expiry)out.push({kind,tag,due:time,expiry,title,body});};
    if(p.break&&s.day===k&&s.breakStart!=null&&s.shiftOpen){
      const end=s.breakUntil==null?Math.min(at(k,1439),s.breakStart+4*60*MIN):Math.min(s.breakUntil,s.breakStart+4*60*MIN);
      add("today","break:"+s.breakStart,s.breakStart+15*MIN,end,"☕ Mola 15 dk","Döndüysen molayı kapat.");
    }
    if(p.exit&&s.day===k&&s.shiftOpen){
      add("today","exit:"+k,at(k,p.exitMinute),at(k,1380),"🌙 Hâlâ mesaide misin?","Çıktıysan çıkışını kaydet.");
    }
    const fresh=Number.isFinite(s.capturedAt)&&now-s.capturedAt>=0&&now-s.capturedAt<8*DAY;
    if(p.entry&&fresh&&wd>0&&wd<6&&!(s.offDates||[]).includes(k)&&!(s.day===k&&s.hasEntry)){
      add("today","entry:"+k,at(k,p.entryMinute),at(k,p.entryMinute+90),"👀 Girişin eksik","İşe başladıysan girişini kaydet.");
    }
    if(p.canias&&fresh&&wd===4&&s.caniasCount>0){
      add("notes","canias:"+k,at(k,840),at(k,900),"📌 Canias zamanı",s.caniasCount+" gün bekliyor. Notlar’ı kontrol et.");
    }
    if(p.weekly&&fresh&&wd===6&&s.weekStart===week&&(s.weekDays>0||s.weekMissing>0)){
      const body="Bu hafta "+signed(s.weekMinutes)+(s.weekMissing?" · "+s.weekMissing+" eksik gün.":". İyi tatiller!");
      add("sum","weekly:"+week,at(k,600),at(k,720),"📊 Haftalık özet",body);
    }
    if(p.goal&&s.day===k&&s.shiftOpen&&s.breakStart==null&&Number.isFinite(s.targetAt)&&wd>0&&wd<6&&!(s.offDates||[]).includes(k)){
      add("today","goal:"+k,s.targetAt,Math.min(s.targetAt+90*MIN,at(k,1439)),"✅ Günlük hedef tamam","Çıkışını kaydetmeyi unutma.");
    }
    if(p.missing&&fresh&&wd===5&&s.missingCount>0){
      add("sum","missing:"+week,at(k,960),at(k,1080),"📝 Eksik kayıt var",s.missingCount+" günün çıkışını kontrol et.");
    }
    return out;
  }
  const api={defaults,day,at,dow,monday,signed,due};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.MesaiNotificationRules=api;
})(globalThis);

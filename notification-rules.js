(function(root){
  "use strict";
  const MIN=60000, DAY=86400000;
  const defaults={break:true,exit:true,entry:true,weekly:true,canias:true,entryMinute:510,exitMinute:1110};
  function day(ms){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(ms);}
  const at=(k,m)=>Date.parse(k+"T00:00:00+03:00")+m*MIN;
  const dow=k=>new Date(at(k,720)).getUTCDay();
  const monday=k=>day(at(k,720)-((dow(k)+6)%7)*DAY);
  const signed=m=>(m>0?"+":m<0?"−":"")+(Math.abs(m)>=60?Math.floor(Math.abs(m)/60)+" saat"+(Math.abs(m)%60?" "+Math.abs(m)%60+" dakika":""):Math.abs(m)+" dakika");
  function due(s,p,now){
    if(!s||!p||!p.enabled)return [];
    const k=day(now),wd=dow(k),week=monday(k),out=[];
    const add=(kind,tag,time,expiry,title,body)=>{if(now>=time&&now<expiry)out.push({kind,tag,due:time,expiry,title,body});};
    if(p.break&&s.day===k&&s.breakStart!=null&&s.shiftOpen){
      const end=s.breakUntil==null?Math.min(at(k,1439),s.breakStart+4*60*MIN):Math.min(s.breakUntil,s.breakStart+4*60*MIN);
      add("today","break:"+s.breakStart,s.breakStart+15*MIN,end,"☕ Molayı kapatmayı mı unuttun?","15 dakika oldu. Döndüysen mola kaydını kontrol et.");
    }
    if(p.exit&&s.day===k&&s.shiftOpen){
      add("today","exit:"+k,at(k,p.exitMinute),at(k,1380),"🌙 Hâlâ mesaidesin sanırım…","Senin adına üzüldüm 😅 Çıktıysan çıkışını kaydet.");
    }
    const fresh=Number.isFinite(s.capturedAt)&&now-s.capturedAt>=0&&now-s.capturedAt<8*DAY;
    if(p.entry&&fresh&&wd>0&&wd<6&&!(s.offDates||[]).includes(k)&&!(s.day===k&&s.hasEntry)){
      add("today","entry:"+k,at(k,p.entryMinute),at(k,p.entryMinute+90),"👀 Girişini kaydetmeyi mi unuttun?","Ofisteysen veya dış görevdeysen girişini kontrol et.");
    }
    if(p.canias&&fresh&&wd===5&&s.caniasCount>0){
      add("notes","canias:"+k,at(k,840),at(k,900),"📌 Hafta bitmeden Canias işini kapatalım 😄","Son kayıtlarına göre girilmeyi bekleyen "+s.caniasCount+" dış görev günün var.");
    }
    if(p.weekly&&fresh&&wd===6&&s.weekStart===week&&(s.weekDays>0||s.weekMissing>0)){
      const body=s.weekDays+" tamamlanan günün kayıtlarına göre bu hafta "+signed(s.weekMinutes)+"."+(s.weekMissing?" "+s.weekMissing+" günün çıkışı eksik; toplam henüz kesin değil.":" İyi hafta sonları!");
      add("sum","weekly:"+week,at(k,600),at(k,720),"📊 Haftalık özetin hazır",body);
    }
    return out;
  }
  const api={defaults,day,at,dow,monday,signed,due};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.MesaiNotificationRules=api;
})(globalThis);

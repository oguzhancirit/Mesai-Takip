const CACHE = "mesai-takip-v13";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "notifications-config.js", "notification-rules.js", "notifications.js?v=2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("mesai-notification-test-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (e.request.mode === "navigate") {
    // network first for the page so updates arrive, cache when offline
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); return r; })
      .catch(() => caches.match("index.html")));
    return;
  }
  if (url.origin === location.origin || url.host.endsWith("fonts.googleapis.com") || url.host.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    })));
  }
});


// Notifications never write attendance records or change the app URL/scope.
self.addEventListener("push", e => {
  let p; try { p=e.data?.json(); } catch {}
  if(!p||!['today','notes','sum'].includes(p.kind)||typeof p.title!=="string"||typeof p.body!=="string"||!Number.isFinite(p.expiry)||Date.now()>=p.expiry){
    p={kind:'today',title:'Mesai Takip',body:'Güncel durumunu uygulamadan kontrol edebilirsin.',tag:'mesai-update'};
  }
  e.waitUntil(self.registration.showNotification(p.title.slice(0,120),{body:p.body.slice(0,400),tag:String(p.tag||"mesai").slice(0,120),icon:"icon-192.png",badge:"icon-192.png",data:{tab:p.kind},renotify:false}));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const tab=['today','notes','sum'].includes(e.notification.data?.tab)?e.notification.data.tab:'today';
  const target=new URL("./",self.registration.scope);target.searchParams.set("notification",tab);
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients=>{
    const client=clients.find(c=>c.url.startsWith(self.registration.scope));
    if(client){await client.focus();client.postMessage({type:"mesai-open",tab});return;}
    return self.clients.openWindow(target.href);
  }));
});

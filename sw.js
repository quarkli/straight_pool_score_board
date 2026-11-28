const VERSION='20261128.70',PREFIX='straight-pool-app-',CACHE=PREFIX+VERSION;
const FILES=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png',...['compatibility.js','app.js','engine.js','scoreboard.js','history.js','practice.js','rules.js','deletion.js','pwa.js','wake-lock.js','style.css','demo-games.json'].map(p=>'./'+p+'?v='+VERSION)];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(file=>new Request(new URL(file,self.registration.scope),{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
 if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 const navigation=request.mode==='navigate';
 if(!navigation&&!FILES.some(file=>new URL(file,scope).pathname===url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),key=navigation?new URL('./index.html',scope).href:request;
  try{const response=await fetch(request,{cache:'no-cache'});if(response.ok)event.waitUntil(cache.put(key,response.clone()));return response;}
  catch(error){const cached=await cache.match(key);if(cached)return cached;throw error;}
 })());
});

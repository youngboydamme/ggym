// GGym — service worker: chạy offline, tự cập nhật ở lần mở sau
const CACHE = 'ggym-v24';
const SHELL = ['./', './index.html', './manifest.webmanifest', './css/app.css',
  './js/util.js', './js/library.js', './js/store.js', './js/ui.js', './js/guide.js', './js/views.js', './js/sheet.js', './js/io.js', './js/sync.js', './js/main.js',
  './icons/icon-32.png', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './img/abduct-0.jpg','./img/abduct-1.jpg','./img/bb-curl-0.jpg','./img/bb-curl-1.jpg','./img/bb-row-0.jpg','./img/bb-row-1.jpg','./img/bench-0.jpg','./img/bench-1.jpg','./img/bss-0.jpg','./img/bss-1.jpg','./img/cable-crunch-0.jpg','./img/cable-crunch-1.jpg','./img/cable-curl-0.jpg','./img/cable-curl-1.jpg','./img/cable-fly-0.jpg','./img/cable-fly-1.jpg','./img/cable-lat-0.jpg','./img/cable-lat-1.jpg','./img/cable-row-0.jpg','./img/cable-row-1.jpg','./img/calf-0.jpg','./img/calf-1.jpg','./img/chest-press-0.jpg','./img/chest-press-1.jpg','./img/chinup-0.jpg','./img/chinup-1.jpg','./img/crunch-0.jpg','./img/crunch-1.jpg','./img/db-bench-0.jpg','./img/db-bench-1.jpg','./img/db-curl-0.jpg','./img/db-curl-1.jpg','./img/db-row-0.jpg','./img/db-row-1.jpg','./img/db-sp-0.jpg','./img/db-sp-1.jpg','./img/deadlift-0.jpg','./img/deadlift-1.jpg','./img/dip-0.jpg','./img/dip-1.jpg','./img/face-pull-0.jpg','./img/face-pull-1.jpg','./img/goblet-0.jpg','./img/goblet-1.jpg','./img/hack-0.jpg','./img/hack-1.jpg','./img/hammer-0.jpg','./img/hammer-1.jpg','./img/hip-thrust-0.jpg','./img/hip-thrust-1.jpg','./img/hlr-0.jpg','./img/hlr-1.jpg','./img/incl-bb-0.jpg','./img/incl-bb-1.jpg','./img/incl-db-0.jpg','./img/incl-db-1.jpg','./img/lat-raise-0.jpg','./img/lat-raise-1.jpg','./img/leg-curl-0.jpg','./img/leg-curl-1.jpg','./img/leg-ext-0.jpg','./img/leg-ext-1.jpg','./img/legpress-0.jpg','./img/legpress-1.jpg','./img/lunge-0.jpg','./img/lunge-1.jpg','./img/oh-ext-0.jpg','./img/oh-ext-1.jpg','./img/ohp-0.jpg','./img/ohp-1.jpg','./img/pec-deck-0.jpg','./img/pec-deck-1.jpg','./img/preacher-0.jpg','./img/preacher-1.jpg','./img/pulldown-0.jpg','./img/pulldown-1.jpg','./img/pullup-0.jpg','./img/pullup-1.jpg','./img/pushdown-0.jpg','./img/pushdown-1.jpg','./img/pushup-0.jpg','./img/pushup-1.jpg','./img/rdl-0.jpg','./img/rdl-1.jpg','./img/rear-fly-0.jpg','./img/rear-fly-1.jpg','./img/seat-curl-0.jpg','./img/seat-curl-1.jpg','./img/shrug-0.jpg','./img/shrug-1.jpg','./img/skull-0.jpg','./img/skull-1.jpg','./img/squat-0.jpg','./img/squat-1.jpg','./img/tbar-0.jpg','./img/tbar-1.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // chỉ cache file của app, font và ảnh minh hoạ; mọi request Supabase đi thẳng ra mạng
  const host = new URL(req.url).host;
  if (host !== self.location.host && !/(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com|raw\.githubusercontent\.com|wger\.de)$/.test(host)) return;
  if (host === 'wger.de' && !/^\/media\/exercise-images\//.test(new URL(req.url).pathname)) return;
  if (req.mode === 'navigate') {
    // stale-while-revalidate cho trang chính: mở ngay từ cache, cập nhật nền
    e.respondWith(caches.open(CACHE).then(async c => {
      const cached = await c.match('./index.html');
      const net = fetch(req).then(res => { if (res.ok) c.put('./index.html', res.clone()); return res; }).catch(() => cached);
      return cached || net;
    }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  }).catch(() => hit)));
});

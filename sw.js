/* Kanji ilovasi — service worker (hub + ichki ilovalar uchun bitta).
   Versiya avtomatik: hub sahifasi sw.js ga ?v=<versiya> qo'shib ro'yxatdan o'tkazadi.
   Fayllar o'zgarganda versiya o'zgaradi, yangi SW o'rnatiladi, eski kesh o'chadi. */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'kanji-app-' + VERSION;
const PRECACHE = [
  './',
  './index.html',
  './index1.html',
  './index2.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './splash-art.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // bitta fayl topilmasa ham o'rnatish to'xtab qolmasin
    await Promise.all(PRECACHE.map((u) =>
      cache.add(new Request(u, { cache: 'reload' })).catch(() => {})
    ));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Sahifa ishlayotgan versiyani so'raydi (akkaunt menyusidagi raqam uchun)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: VERSION });
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Boshqa domenlar (Firebase, Google Fonts va h.k.) — o'zgarishsiz o'tkazamiz
  if (url.origin !== self.location.origin) return;
  // Audio/video diapazon so'rovlari keshga yozilmaydi
  if (req.headers.has('range')) return;

  if (req.mode === 'navigate') {
    // Sahifalar: avval tarmoq, ishlamasa kesh (oflayn ham ochiladi)
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (e) {
        return (await caches.match(req, { ignoreSearch: true })) ||
               (await caches.match('./index.html')) ||
               Response.error();
      }
    })());
    return;
  }

  // Qolgan fayllar (rasm, css, js, audio): keshdan tez beriladi, fonda yangilanadi
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});

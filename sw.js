// Kanji Flashcard — minimal service worker
// Vazifasi: ilova qobig'ini (index.html + ikonkalar) keshga olish, shu bilan
// ilova internetsiz ham ochiladi va PWA sifatida o'rnatilishi yanada
// ishonchli bo'ladi. Lug'at ma'lumotlari index.html ichida saqlangani
// uchun alohida keshlashning hojati yo'q.

const CACHE_NAME = 'kanji-flashcard-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-any-192.png',
  './icons/icon-any-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Network-first strategiya index.html uchun (har doim eng yangi versiyani
// olishga harakat qiladi), boshqa hamma narsa uchun cache-first (tezroq,
// kamroq trafik). Ikkalasida ham tarmoq mavjud bo'lmasa keshdan qaytariladi.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isHTML = event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      }).catch(() => cached);
    })
  );
});

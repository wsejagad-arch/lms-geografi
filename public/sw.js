const CACHE = 'geo-edulabs-v13';
const ASSETS = [
  '/manifest.json',
  '/assets/css/style.css',
  '/assets/css/login.css',
  '/assets/css/admin.css',
  '/assets/css/student.css',
  '/assets/css/belajar.css',
  '/assets/js/sanitize.js',
  '/assets/js/api.js',
  '/assets/js/admin.js',
  '/assets/js/student.js',
  '/assets/js/belajar.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Respons API tidak di-cache agar perubahan data langsung terlihat.
  if (new URL(e.request.url).pathname.startsWith('/api/')) return;

  // Halaman HTML: network-first; bila offline pakai salinan terakhir atau pesan singkat.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request).then((cached) => cached || new Response(
        '<!doctype html><meta charset="utf-8"><title>Offline</title><p style="font-family:system-ui;padding:24px">Tidak ada koneksi. Sambungkan internet lalu muat ulang halaman.</p>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return networkResponse;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

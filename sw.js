// Raya Brief — app-shell service worker (network-first page so deploys auto-refresh).
// Brief DATA is always fetched live from Supabase (network), never cached.
const SHELL = 'raya-shell-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;            // auth + data: always live
  // Page/navigation: network-first so new deploys show on a normal refresh.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then(h => h || caches.match('./')))
    );
    return;
  }
  // Static assets (icons, manifest): cache-first.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});

import { build, files, version } from '$service-worker';

const CACHE = `mfn-shell-${version}`;
const SHELL = [...new Set([...build, ...files, '/'])];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('mfn-shell-') && key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match('/')) || Response.error();
    }));
    return;
  }

  if (SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});

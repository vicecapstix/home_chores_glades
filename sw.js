// FamilyFlow service worker — network-first app shell, same-origin only.
// Database, auth and font requests are cross-origin and never touched.
const CACHE = 'familyflow-shell-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first, but on a slow link (fetch hangs rather than fails) serve the
// cached copy after NETWORK_TIMEOUT_MS while the network response still
// refreshes the cache when it eventually arrives. No cached copy = just wait.
const NETWORK_TIMEOUT_MS = 3000;
const TIMED_OUT = {};

function shellResponse(req, keepAlive, timeoutMs) {
  const net = fetch(req).then(res => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  });
  if (keepAlive) keepAlive(net.catch(() => {}));
  const offline = () => caches.match(req).then(hit => hit || caches.match('./'));
  let timer;
  const timeout = new Promise(r => { timer = setTimeout(() => r(TIMED_OUT), timeoutMs); });
  return Promise.race([net, timeout]).then(first => {
    clearTimeout(timer);
    if (first !== TIMED_OUT) return first;
    return caches.match(req)
      .then(hit => hit || (req.mode === 'navigate' ? caches.match('./') : undefined))
      .then(hit => hit || net.catch(offline));
  }, () => { clearTimeout(timer); return offline(); });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(shellResponse(req, p => event.waitUntil(p), NETWORK_TIMEOUT_MS));
});

// Tapping an overdue reminder focuses an open FamilyFlow tab, or opens the app.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const open = list.find(c => 'focus' in c);
      return open ? open.focus() : self.clients.openWindow(self.registration.scope);
    })
  );
});

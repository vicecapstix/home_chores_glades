// Service worker registration — guarded so it never breaks the app.
export function canRegister(nav = globalThis.navigator, loc = globalThis.location, prod = import.meta.env?.PROD) {
  if (!prod || !nav || !('serviceWorker' in nav) || !loc) return false;
  return loc.protocol === 'https:' || loc.hostname === 'localhost' || loc.hostname === '127.0.0.1';
}

export async function registerServiceWorker(nav = globalThis.navigator, loc = globalThis.location, prod = import.meta.env?.PROD) {
  if (!canRegister(nav, loc, prod)) return null;
  try {
    return await nav.serviceWorker.register('sw.js');
  } catch (e) {
    return null; // offline shell is a nice-to-have
  }
}

// ── New-version detection (#312) ──────────────────────────────────────────────
// sw.js rarely changes, so a deploy is detected from the page's own ETag / Last-Modified
// (one HEAD request from GitHub Pages, no Firebase reads). Off when the service worker can't register.
export const UPDATE_CHECK_MS = 60 * 60 * 1000;
export const IDLE_RETRY_MS = 30 * 1000;
const RELOADED_KEY = 'ff_reloaded_for';

export async function versionTag(fetchFn = globalThis.fetch, url = globalThis.location && globalThis.location.pathname) {
  try {
    const r = await fetchFn(url, { method: 'HEAD', cache: 'no-store' });
    return (r && r.ok && r.headers && (r.headers.get('etag') || r.headers.get('last-modified'))) || null;
  } catch (e) { return null; }
}

// Returns a stop() function, or null when the feature is off. onUpdate(tag) fires once per new version.
export function watchForUpdates({ onUpdate, reg = null, nav = globalThis.navigator, loc = globalThis.location, prod = import.meta.env?.PROD, fetchFn = globalThis.fetch, intervalMs = UPDATE_CHECK_MS } = {}) {
  if (!canRegister(nav, loc, prod) || !fetchFn) return null;
  let baseline = null, seen = null;
  const fire = tag => { if (tag !== seen) { seen = tag; onUpdate(tag); } };
  const hadController = !!nav.serviceWorker.controller;
  if (hadController) nav.serviceWorker.addEventListener('controllerchange', () => fire('sw'));
  const check = async () => {
    try { if (reg && reg.update) await reg.update(); } catch (e) { /* offline: ignore */ }
    const tag = await versionTag(fetchFn, loc.pathname);
    if (!tag) return;
    if (baseline === null) baseline = tag;
    else if (tag !== baseline) fire(tag);
  };
  check();
  const id = setInterval(check, intervalMs);
  return () => clearInterval(id);
}

// TV: reload once per version, only when nothing is open. `busy()` true = retry later; a failed update never loops.
export function reloadWhenIdle(tag, { busy, reload, storage = globalThis.sessionStorage, schedule = setTimeout, retryMs = IDLE_RETRY_MS }) {
  let done = null;
  try { done = storage.getItem(RELOADED_KEY); } catch (e) { /* storage blocked */ }
  if (done === String(tag)) return false;
  if (busy()) { schedule(() => reloadWhenIdle(tag, { busy, reload, storage, schedule, retryMs }), retryMs); return false; }
  try { storage.setItem(RELOADED_KEY, String(tag)); } catch (e) { /* storage blocked: reload anyway, once per page load */ }
  reload();
  return true;
}

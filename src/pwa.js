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

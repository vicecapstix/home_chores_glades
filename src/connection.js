// Connection indicator driven by Firebase's free `.info/connected` — display only.
const GRACE_MS = 4000;
let everConnected = false;
let graceOver = false;
let timer = null;
let pendingN = 0;
let isOffline = false;
const BANNER_DEFAULT = 'Offline — changes will sync when you reconnect';

export function formatTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Shows "offline" only after we have been connected once, or the first connect took > GRACE_MS,
// so the banner doesn't flash on every page load.
export function setConnection(connected, doc = document) {
  if (connected) everConnected = true;
  const offline = !connected && (everConnected || graceOver);
  const dot = doc.querySelector('.live-dot');
  const banner = doc.getElementById('offline-banner');
  if (dot) {
    dot.classList.toggle('offline', offline);
    dot.title = offline ? 'Offline' : 'Live sync';
  }
  if (banner) banner.classList.toggle('hidden', !offline);
  isOffline = offline;
  paintBanner(doc);
  return offline;
}

function paintBanner(doc) {
  const banner = doc.getElementById('offline-banner');
  if (!banner) return;
  banner.textContent = isOffline && pendingN > 0
    ? pendingN + (pendingN === 1 ? ' change' : ' changes') + ' waiting — will sync when you reconnect'
    : BANNER_DEFAULT;
}

// Unsynced task writes (#144): shown in the offline banner while offline.
export function setPendingCount(n, doc = document) { pendingN = n; paintBanner(doc); }

export function markSynced(now = new Date(), doc = document) {
  const el = doc.getElementById('tv-synced');
  if (el) el.textContent = 'Last synced ' + formatTime(now);
}

export function watchConnection(db, { onValue, ref }, doc = document) {
  graceOver = false;
  clearTimeout(timer);
  timer = setTimeout(() => { graceOver = true; if (!everConnected) setConnection(false, doc); }, GRACE_MS);
  return onValue(ref(db, '.info/connected'), snap => setConnection(snap.val() === true, doc));
}

export function _resetForTests() { pendingN = 0; isOffline = false; everConnected = false; graceOver = false; clearTimeout(timer); timer = null; }

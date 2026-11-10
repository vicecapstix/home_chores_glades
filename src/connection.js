// Connection indicator driven by Firebase's free `.info/connected` — display only.
const GRACE_MS = 4000;
let everConnected = false;
let graceOver = false;
let timer = null;
let pendingN = 0;
let isOffline = false;
let connectedNow = null; // last .info/connected value; null until Firebase reports (#310)
let lastUpdated = 0; // ms of the last live snapshot, or the cache time on a cached start (#258)
const BANNER_DEFAULT = 'Offline — changes will sync when you reconnect';

export function formatTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// "14:05", "yesterday 21:10", or "Mon, 4 May 21:10" for older (#258).
export function formatUpdated(ms, now = Date.now()) {
  if (!ms) return '';
  const d = new Date(ms), n = new Date(now);
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(n) - day(d)) / 86400000);
  const t = formatTime(d);
  if (diff <= 0) return t;
  if (diff === 1) return 'yesterday ' + t;
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + t;
}

export function setLastUpdated(ms, doc = document) { lastUpdated = ms > 0 ? ms : 0; paintBanner(doc); }

// Shows "offline" only after we have been connected once, or the first connect took > GRACE_MS,
// so the banner doesn't flash on every page load.
export function setConnection(connected, doc = document) {
  connectedNow = connected;
  if (connected) everConnected = true;
  const offline = !connected && (everConnected || graceOver);
  const dot = doc.querySelector('.live-dot');
  const banner = doc.getElementById('offline-banner');
  if (dot) {
    dot.classList.toggle('offline', offline);
  }
  if (banner) banner.classList.toggle('hidden', !offline);
  isOffline = offline;
  paintBanner(doc);
  return offline;
}

function paintBanner(doc) {
  const dot = doc.querySelector('.live-dot');
  if (dot) dot.title = isOffline ? 'Offline' + (lastUpdated ? ' · last updated ' + formatUpdated(lastUpdated) : '') : 'Live sync';
  const banner = doc.getElementById('offline-banner');
  if (!banner) return;
  const when = formatUpdated(lastUpdated);
  const base = isOffline && pendingN > 0
    ? pendingN + (pendingN === 1 ? ' change' : ' changes') + ' waiting — will sync when you reconnect'
    : BANNER_DEFAULT;
  banner.textContent = base + (when ? ' · Last updated ' + when : '');
}

// Unsynced task writes (#144): shown in the offline banner while offline.
export function setPendingCount(n, doc = document) { pendingN = n; paintBanner(doc); }

// True only once Firebase has said it is disconnected: local-write echoes then are not server data (#310).
export function isDisconnected() { return connectedNow === false; }

export function markSynced(now = new Date(), doc = document) {
  if (isDisconnected()) return;
  lastUpdated = now.getTime();
  const el = doc.getElementById('tv-synced');
  if (el) el.textContent = 'Last synced ' + formatTime(now);
}

export function watchConnection(db, { onValue, ref }, doc = document) {
  graceOver = false;
  clearTimeout(timer);
  timer = setTimeout(() => { graceOver = true; if (!everConnected) setConnection(false, doc); }, GRACE_MS);
  return onValue(ref(db, '.info/connected'), snap => setConnection(snap.val() === true, doc));
}

export function _resetForTests() { connectedNow = null; pendingN = 0; lastUpdated = 0; isOffline = false; everConnected = false; graceOver = false; clearTimeout(timer); timer = null; }

// Device-local snapshot cache (localStorage) so a slow/offline screen shows last-known data.
// history is oldest-first, so keep the newest entries (slice(-N)).
// Never stores pinHash, /private or session data. No extra Firebase reads.
export const CACHE_KEY = 'familyflow-snapshot-v1';
export const MAX_BYTES = 200 * 1024;
export const HISTORY_LIMIT = 50;

export function trimSnapshot(s) {
  const members = {};
  Object.entries(s.members || {}).forEach(([k, m]) => {
    const rest = { ...(m || {}) };
    delete rest.pinHash;
    members[k] = rest;
  });
  return {
    members,
    tasks: s.tasks || {},
    rewards: s.rewards || {},
    pause: s.pause || null,
    history: (s.history || []).slice(-HISTORY_LIMIT),
    nextId: s.nextId || 1,
    savedAt: Date.now(),
  };
}

// Returns true when written. Skips (and keeps the old copy) if over the size cap.
export function saveSnapshot(s, storage = globalThis.localStorage) {
  try {
    const json = JSON.stringify(trimSnapshot(s));
    if (json.length > MAX_BYTES) return false;
    storage.setItem(CACHE_KEY, json);
    return true;
  } catch (e) { return false; }
}

export function loadSnapshot(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && v.members && v.tasks ? v : null;
  } catch (e) { return null; }
}

export function clearSnapshot(storage = globalThis.localStorage) {
  try { storage.removeItem(CACHE_KEY); return true; } catch (e) { return false; }
}

export function setCacheBanner(show, doc = document) {
  const b = doc.getElementById('cache-banner');
  if (b) b.classList.toggle('hidden', !show);
}

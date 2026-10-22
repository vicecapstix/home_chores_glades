import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, remove, update, onValue, runTransaction } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { FB_URL, READONLY } from './config.js';
import { state } from './state.js';

let _db = null;
let _app = null;
let _live = true; // false while showing cached data, until the first live snapshot

export function setWritesEnabled(v) { _live = !!v; }

export function initFirebase() {
  _app = initializeApp({ databaseURL: FB_URL }, 'homechores');
  _db  = getDatabase(_app);
  return { app: _app, db: _db };
}

export function getDb() { return _db; }

// Anonymous auth. Resolves (never rejects) with { ok, code, message } so the
// caller can warn when Anonymous sign-in is not enabled. The app keeps loading
// either way, so it works both before and after the rules require auth.
export async function initAuth() {
  try {
    const auth = getAuth(_app);
    return await new Promise((resolve) => {
      onAuthStateChanged(auth, user => {
        if (user) { resolve({ ok: true }); }
        else {
          signInAnonymously(auth).then(() => resolve({ ok: true }))
            .catch(e => resolve({ ok: false, code: e?.code || '', message: e?.message || '' }));
        }
      });
    });
  } catch (e) {
    console.warn('Firebase Anonymous Auth not available:', e.message);
    return { ok: false, code: e?.code || '', message: e?.message || '' };
  }
}

export function describeAuthFailure(res) {
  if (!res || res.ok) return '';
  return 'Anonymous sign-in is off (' + (res.code || 'unknown') + '). Enable it in Firebase Console → ' +
    'Authentication → Sign-in method → Anonymous.';
}

// ── Write helpers ─────────────────────────────────────────────────────────────

export async function writeState() {
  if (READONLY || !_db || !_live) return;
  try {
    await set(ref(_db, 'state'), {
      members:   Object.keys(state.members).length   ? state.members   : null,
      tasks:     Object.keys(state.tasks).length     ? state.tasks     : null,
      history:   state.history.length                ? state.history   : null,
      nextId:    state.nextId,
      templates: Object.keys(state.templates || {}).length ? state.templates : null,
      rewards:   Object.keys(state.rewards   || {}).length ? state.rewards   : null,
      redemptions: Object.keys(state.redemptions || {}).length ? state.redemptions : null,
      pause:     state.pause || null,
    });
  } catch (err) {
    throw err; // callers handle with showToast
  }
}

export async function patchTask(id, fields) {
  if (READONLY || !_db || !_live) return;
  await update(ref(_db, 'state/tasks/' + id), fields);
}

export async function patchMember(name, fields) {
  if (READONLY || !_db || !_live) return;
  await update(ref(_db, 'state/members/' + name), fields);
}

// Multi-path update rooted at /state: keys are relative paths, null deletes.
export async function patchPaths(paths) {
  if (READONLY || !_db || !_live) return;
  await update(ref(_db, 'state'), paths);
}

export async function patchRoot(fields) {
  if (READONLY || !_db || !_live) return;
  await update(ref(_db, 'state'), fields);
}

export async function removeTask(id) {
  if (READONLY || !_db || !_live) return;
  await remove(ref(_db, 'state/tasks/' + id));
}

export async function restoreTask(id, data) {
  if (READONLY || !_db || !_live) return;
  await set(ref(_db, 'state/tasks/' + id), data);
}

export async function patchSubtask(taskId, subId, fields) {
  if (READONLY || !_db || !_live) return;
  await update(ref(_db, 'state/tasks/' + taskId + '/subtasks/' + subId), fields);
}

// Atomic points spend: aborts (returns false) if the balance is below cost.
export async function spendPoints(name, cost) {
  if (READONLY || !_db || !_live) return false;
  const res = await runTransaction(ref(_db, 'state/members/' + name + '/points'),
    cur => ((cur || 0) >= cost ? (cur || 0) - cost : undefined));
  return !!res.committed;
}

// Atomically move a pending redemption to approved/denied. Returns false if it
// no longer exists or was already decided (so a request is decided only once).
export async function decideRedemption(id, status, by) {
  if (READONLY || !_db || !_live) return false;
  const res = await runTransaction(ref(_db, 'state/redemptions/' + id),
    cur => (cur && cur.status === 'pending' ? { ...cur, status, decidedAt: Date.now(), decidedBy: by } : undefined));
  return !!res.committed;
}

// Atomic award/reversal of task points on the member's LIVE server value (never
// an absolute from the local cache). opts: { pts (signed), count (signed),
// weekStart, countWeek (touch weekPoints?), allowNegative }. Without
// allowNegative a reversal that the balance cannot cover aborts untouched.
// Returns { ok, reason: 'insufficient'|'missing'|'readonly', member }.
export async function adjustMemberPoints(name, opts) {
  if (READONLY || !_db || !_live) return { ok: false, reason: 'readonly' };
  const { pts = 0, count = 0, weekStart, countWeek = true, allowNegative = false } = opts;
  let reason = '';
  const res = await runTransaction(ref(_db, 'state/members/' + name), cur => {
    if (!cur) { reason = 'missing'; return undefined; }
    const balance = cur.points || 0;
    if (pts < 0 && !allowNegative && balance < -pts) { reason = 'insufficient'; return undefined; }
    const next = { ...cur, points: balance + pts, completedCount: Math.max(0, (cur.completedCount || 0) + count) };
    if (countWeek) {
      next.weekPoints = Math.max(0, (cur.weekStart === weekStart ? (cur.weekPoints || 0) : 0) + pts);
      next.weekStart = weekStart;
    }
    return next;
  });
  return { ok: !!res.committed, reason: res.committed ? '' : reason, member: res.snapshot?.val?.() ?? null };
}

// Atomic history append (#31): runs on the LIVE server array so concurrent
// completions never overwrite each other, then trims to the newest `cap` (500).
export async function appendHistory(entry, cap = 500) {
  if (READONLY || !_db) return { ok: false };
  const res = await runTransaction(ref(_db, 'state/history'), cur => {
    const list = Array.isArray(cur) ? cur : (cur ? Object.values(cur) : []);
    return list.concat([entry]).slice(-cap);
  });
  return { ok: !!res.committed };
}

export async function refundPoints(name, cost) {
  if (READONLY || !_db || !_live) return;
  await runTransaction(ref(_db, 'state/members/' + name + '/points'), cur => (cur || 0) + cost);
}

export { onValue, ref };

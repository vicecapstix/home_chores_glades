import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, remove, update, onValue, runTransaction } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { FB_URL, READONLY, HISTORY_CAP } from './config.js';
import { state } from './state.js';
import { trackWrite } from './pending.js';

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
let _onAuthChange = null;
export function setAuthChangeHandler(fn) { _onAuthChange = fn; }

// Parent (email + password) sign-in. The password is passed straight to Firebase
// Auth and never stored. Resolves { ok } or { ok:false, message } (never rejects).
export function describeParentError(e) {
  const c = (e && e.code) || '';
  if (c === 'auth/operation-not-allowed') return 'Parent sign-in is not enabled yet. Turn on Email/Password in Firebase Console → Authentication.';
  if (c === 'auth/network-request-failed') return 'Network error. Check your connection and try again.';
  if (c === 'auth/too-many-requests') return 'Too many attempts. Wait a few minutes and try again.';
  if (c === 'auth/invalid-email') return 'That email address does not look right.';
  if (c === 'auth/missing-password') return 'Enter your password.';
  return 'Could not sign in. Check your email and password.';
}
export async function parentSignIn(email, password) {
  if (READONLY) return { ok: false, message: 'Read-only view' };
  if (!email || !password) return { ok: false, message: 'Enter your email and password.' };
  try {
    await signInWithEmailAndPassword(getAuth(_app), String(email).trim(), password);
    return { ok: true };
  } catch (e) {
    return { ok: false, code: e?.code || '', message: describeParentError(e) };
  }
}
// Signing out lets onAuthStateChanged fall back to an anonymous session.
export async function parentSignOut() {
  if (READONLY) return { ok: false };
  try { await signOut(getAuth(_app)); return { ok: true }; }
  catch (e) { return { ok: false, message: 'Could not sign out.' }; }
}

export async function initAuth() {
  try {
    const auth = getAuth(_app);
    return await new Promise((resolve) => {
      onAuthStateChanged(auth, user => {
        state.uid = user ? user.uid : null;
        state.parentEmail = !!(user && user.email);
        if (_onAuthChange) _onAuthChange();
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
      claims:    Object.keys(state.claims || {}).length ? state.claims : null,
      pause:     state.pause || null,
    });
  } catch (err) {
    throw err; // callers handle with showToast
  }
}

export async function patchTask(id, fields) {
  if (READONLY || !_db || !_live) return;
  await trackWrite(id, () => update(ref(_db, 'state/tasks/' + id), fields));
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
  await trackWrite(taskId, () => update(ref(_db, 'state/tasks/' + taskId + '/subtasks/' + subId), fields));
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

// Atomically remove a pending extra-job claim (#224). Returns true only for the
// one caller whose transaction removed it, so two parents can't both award it.
export async function takeClaim(id) {
  if (READONLY || !_db || !_live) return false;
  const res = await runTransaction(ref(_db, 'state/claims/' + id), cur => (cur ? null : undefined));
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

const toList = cur => (Array.isArray(cur) ? cur : (cur ? Object.values(cur) : []));

// Atomic history append (#31): runs on the LIVE server array so concurrent
// completions never overwrite each other, then trims to the newest `cap`.
export async function appendHistory(entry, cap = HISTORY_CAP) {
  if (READONLY || !_db) return { ok: false };
  const res = await runTransaction(ref(_db, 'state/history'), cur => toList(cur).concat([entry]).slice(-cap));
  return { ok: !!res.committed };
}

// Atomic removal of ONE history entry (#183) on the LIVE array, so entries other
// devices appended meanwhile survive. `match` = { completedAt, person?, taskId?, type? };
// the newest matching entry goes. Returns { ok, removed, rest } (rest = live list after removal).
export async function removeHistoryEntry(match) {
  if (READONLY || !_db) return { ok: false, removed: false, rest: null };
  let rest = null, found = false;
  const hit = e => e && e.completedAt === match.completedAt && (match.person === undefined || e.person === match.person) &&
    (match.taskId === undefined || e.taskId === match.taskId) && (match.type === undefined || e.type === match.type);
  const res = await runTransaction(ref(_db, 'state/history'), cur => {
    const list = toList(cur);
    let idx = -1;
    for (let i = list.length - 1; i >= 0; i--) { if (hit(list[i])) { idx = i; break; } }
    found = idx >= 0;
    if (idx < 0) { rest = list; return cur === null ? null : undefined; } // null: let the SDK retry on the server value
    rest = list.filter((_, i) => i !== idx);
    return rest;
  });
  const removed = !!res.committed && found;
  return { ok: !!res.committed, removed, rest };
}

export async function refundPoints(name, cost) {
  if (READONLY || !_db || !_live) return;
  await runTransaction(ref(_db, 'state/members/' + name + '/points'), cur => (cur || 0) + cost);
}

export { onValue, ref };

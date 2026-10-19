import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, remove, update, onValue, runTransaction } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { FB_URL, FB_API_KEY, FB_AUTH_DOMAIN, FB_PROJECT_ID, READONLY } from './config.js';
import { state } from './state.js';

let _db = null;
let _app = null;

export function initFirebase() {
  const opts = { databaseURL: FB_URL };
  if (FB_API_KEY) Object.assign(opts, { apiKey: FB_API_KEY, authDomain: FB_AUTH_DOMAIN, projectId: FB_PROJECT_ID });
  _app = initializeApp(opts, 'homechores');
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
        setAuthUser(user);
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

// ── Parent email sign-in (#97) ───────────────────────────────────────────────
// Kids and the TV stay on anonymous sign-in. When a parent signs out, the
// onAuthStateChanged handler above signs the device back in anonymously.

const _authListeners = [];
export function onAuthChange(fn) { _authListeners.push(fn); }

function setAuthUser(user) {
  state.auth = user
    ? { uid: user.uid, isParent: !user.isAnonymous, email: user.email || '' }
    : { uid: '', isParent: false, email: '' };
  _authListeners.forEach(fn => fn(state.auth));
}

// Resolves (never rejects) with { ok, uid } or { ok: false, code }. No password is stored.
export async function parentSignIn(email, password) {
  if (READONLY) return { ok: false, code: 'readonly' };
  try {
    const cred = await signInWithEmailAndPassword(getAuth(_app), String(email || '').trim(), password || '');
    return { ok: true, uid: cred.user.uid };
  } catch (e) {
    return { ok: false, code: e?.code || '' };
  }
}

export async function parentSignOut() {
  try { await signOut(getAuth(_app)); return { ok: true }; }
  catch (e) { return { ok: false, code: e?.code || '' }; }
}

export function describeParentSignInError(code) {
  switch (code) {
    case 'auth/invalid-credential': case 'auth/wrong-password': case 'auth/user-not-found':
    case 'auth/invalid-email': case 'auth/missing-password':
      return 'Wrong email or password';
    case 'auth/too-many-requests':        return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':   return 'No connection. Check your internet and try again.';
    case 'auth/operation-not-allowed':
      return 'Email sign-in is off. Enable it in Firebase Console → Authentication → Sign-in method → Email/Password.';
    case 'auth/invalid-api-key':
      return 'Firebase API key missing. Set FB_API_KEY in src/config.js.';
    default: return 'Sign-in failed (' + (code || 'unknown') + ')';
  }
}

// /admins/<uid>: "<member name>" — root level, read-only for clients (JT edits it in
// the Console). If it can't be read (rules not applied yet) it counts as empty.
export function watchAdmins(onChange) {
  if (!_db) return;
  onValue(ref(_db, 'admins'), snap => {
    state.admins = snap.val() || {};
    onChange();
  }, () => {
    state.admins = {};
    onChange();
  });
}

export function describeAuthFailure(res) {
  if (!res || res.ok) return '';
  return 'Anonymous sign-in is off (' + (res.code || 'unknown') + '). Enable it in Firebase Console → ' +
    'Authentication → Sign-in method → Anonymous.';
}

// ── Write helpers ─────────────────────────────────────────────────────────────

export async function writeState() {
  if (READONLY || !_db) return;
  try {
    await set(ref(_db, 'state'), {
      members:   Object.keys(state.members).length   ? state.members   : null,
      tasks:     Object.keys(state.tasks).length     ? state.tasks     : null,
      history:   state.history.length                ? state.history   : null,
      nextId:    state.nextId,
      templates: Object.keys(state.templates || {}).length ? state.templates : null,
      rewards:   Object.keys(state.rewards   || {}).length ? state.rewards   : null,
      redemptions: Object.keys(state.redemptions || {}).length ? state.redemptions : null,
    });
  } catch (err) {
    throw err; // callers handle with showToast
  }
}

export async function patchTask(id, fields) {
  if (READONLY || !_db) return;
  await update(ref(_db, 'state/tasks/' + id), fields);
}

export async function patchMember(name, fields) {
  if (READONLY || !_db) return;
  await update(ref(_db, 'state/members/' + name), fields);
}

export async function patchRoot(fields) {
  if (READONLY || !_db) return;
  await update(ref(_db, 'state'), fields);
}

export async function removeTask(id) {
  if (READONLY || !_db) return;
  await remove(ref(_db, 'state/tasks/' + id));
}

export async function restoreTask(id, data) {
  if (READONLY || !_db) return;
  await set(ref(_db, 'state/tasks/' + id), data);
}

export async function patchSubtask(taskId, subId, fields) {
  if (READONLY || !_db) return;
  await update(ref(_db, 'state/tasks/' + taskId + '/subtasks/' + subId), fields);
}

// Atomic points spend: aborts (returns false) if the balance is below cost.
export async function spendPoints(name, cost) {
  if (READONLY || !_db) return false;
  const res = await runTransaction(ref(_db, 'state/members/' + name + '/points'),
    cur => ((cur || 0) >= cost ? (cur || 0) - cost : undefined));
  return !!res.committed;
}

// Atomically move a pending redemption to approved/denied. Returns false if it
// no longer exists or was already decided (so a request is decided only once).
export async function decideRedemption(id, status, by) {
  if (READONLY || !_db) return false;
  const res = await runTransaction(ref(_db, 'state/redemptions/' + id),
    cur => (cur && cur.status === 'pending' ? { ...cur, status, decidedAt: Date.now(), decidedBy: by } : undefined));
  return !!res.committed;
}

export async function refundPoints(name, cost) {
  if (READONLY || !_db) return;
  await runTransaction(ref(_db, 'state/members/' + name + '/points'), cur => (cur || 0) + cost);
}

export { onValue, ref };

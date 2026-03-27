import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, remove, update, onValue } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { FB_URL, READONLY } from './config.js';
import { state } from './state.js';

let _db = null;
let _app = null;

export function initFirebase() {
  _app = initializeApp({ databaseURL: FB_URL }, 'homechores');
  _db  = getDatabase(_app);
  return { app: _app, db: _db };
}

export function getDb() { return _db; }

// Anonymous auth — optional security layer.
// Gracefully degrades if Anonymous Auth is not enabled in Firebase Console.
export async function initAuth() {
  try {
    const auth = getAuth(_app);
    await new Promise((resolve) => {
      onAuthStateChanged(auth, user => {
        if (user) { resolve(user); }
        else { signInAnonymously(auth).then(resolve).catch(resolve); }
      });
    });
  } catch (e) {
    // Anonymous auth not enabled — continue with open rules
    console.warn('Firebase Anonymous Auth not available:', e.message);
  }
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

export { onValue, ref };

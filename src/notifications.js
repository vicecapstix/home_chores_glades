import { state } from './state.js';
import { READONLY } from './config.js';
import { dueStatus, localDateStr, dueTimePassedToday } from './utils.js';
import { inQuietHours, isHeld, setHeld, syncQuietButton } from './quiethours.js';

let _notifiedIds = new Set();
const _pending = new Map();
let _started = false;
let _currentMember = () => '';

export function initNotifications(currentMemberFn) {
  _currentMember = currentMemberFn || (() => '');
  syncNotifyButton();
  syncQuietButton();
  if (notificationsSupported() && Notification.permission === 'granted') scheduleOverdueCheck();
}

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Only the current member's own overdue chores — never the whole house.
export function selectNotifyTasks(tasks, me) {
  if (!me) return [];
  return Object.values(tasks).filter(t => !t.done && t.person === me && dueStatus(t) === 'overdue');
}

export function syncNotifyButton() {
  const btn = document.getElementById('btn-notify');
  if (!btn) return;
  const show = notificationsSupported() && Notification.permission === 'default' && !!_currentMember();
  btn.classList.toggle('hidden', !show);
}

// Called from a button click (user gesture) — the only place permission is requested.
export async function enableNotifications() {
  if (!notificationsSupported()) return 'unsupported';
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  syncNotifyButton();
  syncQuietButton();
  if (perm === 'granted') scheduleOverdueCheck();
  return perm;
}

function scheduleOverdueCheck() {
  if (_started) return;
  _started = true;
  runOverdueCheck();
  setInterval(runOverdueCheck, 30 * 60 * 1000);
}

// Android Chrome/PWAs throw on `new Notification()`; use the service worker there.
// Resolves true only when a notification was actually shown.
async function showOverdue(body, tag = 'ff-overdue-' + body) {
  const opts = { body, icon: './icon-192.png', tag };
  try {
    const sw = typeof navigator !== 'undefined' && navigator.serviceWorker;
    if (sw && sw.getRegistration && await sw.getRegistration()) {
      const reg = await sw.ready;
      await reg.showNotification('FamilyFlow', opts);
      return true;
    }
  } catch(e) { /* fall through to constructor */ }
  try { new Notification('FamilyFlow', opts); return true; } catch(e) { return false; }
}

// Quiet hours (#401): chores that would have notified are held back; the first check after the window
// sends ONE summary for everything held (overdue and due-time), instead of a burst.
let _summaryBusy = false;
const unnotifiedOverdue = () => selectNotifyTasks(state.tasks, _currentMember()).filter(t => !_notifiedIds.has(t.id));
const unseenDue = now => { const seen = dueSeen(); return selectDueTimeTasks(state.tasks, _currentMember(), now).filter(t => !seen.includes(t.id)); };
function quietGate(now, candidates) { // true = hold back; otherwise may return a summary promise via quietSummary
  if (!inQuietHours(now)) return false;
  if (candidates > 0) setHeld(true);
  return true;
}
function quietSummary(now) {
  if (!isHeld() || _summaryBusy) return null;
  setHeld(false);
  const over = unnotifiedOverdue(), due = unseenDue(now);
  const ids = new Set([...over, ...due].map(t => t.id));
  if (ids.size < 2) return null; // a single held chore is shown normally
  _summaryBusy = true;
  return showOverdue(ids.size + ' chores need your attention', 'ff-quiet-summary').then(ok => {
    _summaryBusy = false;
    if (!ok) { setHeld(true); return; }
    ids.forEach(id => { _notifiedIds.add(id); markDueSeen(id); }); // mentioned once: no repeat from either check
  });
}

export function runOverdueCheck(now = Date.now()) {
  const today = localDateStr();
  try {
    if (localStorage.getItem('fc_last_notify_date') !== today) {
      _notifiedIds = new Set();
      localStorage.setItem('fc_last_notify_date', today);
    }
  } catch(e) {}
  if (!notificationsSupported() || Notification.permission !== 'granted') return Promise.resolve();
  if (quietGate(now, unnotifiedOverdue().length)) return Promise.resolve();
  const summary = quietSummary(now);
  if (summary) return summary;
  const jobs = selectNotifyTasks(state.tasks, _currentMember()).map(t => {
    if (_notifiedIds.has(t.id)) return null;
    if (_pending.has(t.id)) return _pending.get(t.id);
    const p = showOverdue(t.name + ' is overdue').then(ok => {
      _pending.delete(t.id);
      if (ok) _notifiedIds.add(t.id); // only mark once actually shown
    });
    _pending.set(t.id, p);
    return p;
  });
  return Promise.all(jobs);
}

// Due-time reminders (#150): one local notification per chore per day once its dueTime passes.
// Runs on the rollover tick (no timer of its own); phones/tablets only, never the TV or while paused.
const DUE_KEY = 'ff_due_notified';
const _duePending = new Set();

function dueSeen() {
  try {
    const v = JSON.parse(localStorage.getItem(DUE_KEY) || 'null');
    if (v && v.date === localDateStr() && Array.isArray(v.ids)) return v.ids;
  } catch(e) {}
  return [];
}
function markDueSeen(id) {
  try { localStorage.setItem(DUE_KEY, JSON.stringify({ date: localDateStr(), ids: [...new Set([...dueSeen(), id])] })); } catch(e) {}
}

export function selectDueTimeTasks(tasks, me, now = Date.now()) {
  if (!me) return [];
  return Object.values(tasks || {}).filter(t => (!t.person || t.person === me) && dueTimePassedToday(t, now));
}

export function runDueTimeCheck(now = Date.now()) {
  if (READONLY || !notificationsSupported() || Notification.permission !== 'granted') return Promise.resolve();
  if (quietGate(now, unseenDue(now).length)) return Promise.resolve();
  const summary = quietSummary(now);
  if (summary) return summary;
  const seen = dueSeen();
  return Promise.all(selectDueTimeTasks(state.tasks, _currentMember(), now).map(t => {
    if (seen.includes(t.id) || _duePending.has(t.id)) return null;
    _duePending.add(t.id);
    return showOverdue(t.name + ' was due at ' + t.dueTime, 'ff-due-' + t.id).then(ok => {
      _duePending.delete(t.id);
      if (ok) markDueSeen(t.id); // only mark once actually shown
    });
  }));
}

// Parent check (#239): one local "N chores to check" notification per day on the admin's device.
// Called by tocheck.js with the waiting count; no server push, nothing on the TV.
const TC_KEY = 'ff_tocheck_notified';
let _tcBusy = false;
export function runToCheckNotify(count, now = Date.now()) {
  if (READONLY || !(count > 0) || !notificationsSupported() || Notification.permission !== 'granted' || _tcBusy) return Promise.resolve(false);
  if (inQuietHours(now)) return Promise.resolve(false); // not marked: fires once quiet hours end
  const today = localDateStr(new Date(now));
  try { if (localStorage.getItem(TC_KEY) === today) return Promise.resolve(false); } catch(e) {}
  _tcBusy = true;
  return showOverdue(count + (count === 1 ? ' chore' : ' chores') + ' to check', 'ff-tocheck').then(ok => {
    _tcBusy = false;
    if (ok) { try { localStorage.setItem(TC_KEY, today); } catch(e) {} } // only mark once actually shown
    return ok;
  });
}

export function _resetForTests() { _tcBusy = false; _summaryBusy = false; _duePending.clear(); _notifiedIds = new Set(); _pending.clear(); _started = false; _currentMember = () => ''; }

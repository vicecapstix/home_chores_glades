import { state } from './state.js';
import { READONLY } from './config.js';
import { dueStatus, localDateStr, dueTimePassedToday } from './utils.js';

let _notifiedIds = new Set();
const _pending = new Map();
let _started = false;
let _currentMember = () => '';

export function initNotifications(currentMemberFn) {
  _currentMember = currentMemberFn || (() => '');
  syncNotifyButton();
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

export function runOverdueCheck() {
  const today = localDateStr();
  try {
    if (localStorage.getItem('fc_last_notify_date') !== today) {
      _notifiedIds = new Set();
      localStorage.setItem('fc_last_notify_date', today);
    }
  } catch(e) {}
  if (!notificationsSupported() || Notification.permission !== 'granted') return Promise.resolve();
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

export function _resetForTests() { _duePending.clear(); _notifiedIds = new Set(); _pending.clear(); _started = false; _currentMember = () => ''; }

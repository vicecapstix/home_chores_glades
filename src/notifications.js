import { state } from './state.js';
import { dueStatus, localDateStr } from './utils.js';

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
async function showOverdue(body) {
  const opts = { body, icon: './icon-192.png', tag: 'ff-overdue-' + body };
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

export function _resetForTests() { _notifiedIds = new Set(); _pending.clear(); _started = false; _currentMember = () => ''; }

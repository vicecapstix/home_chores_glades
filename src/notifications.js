import { state } from './state.js';
import { dueStatus, localDateStr } from './utils.js';

let _notifiedIds = new Set();
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

export function runOverdueCheck() {
  const today = localDateStr();
  try {
    if (localStorage.getItem('fc_last_notify_date') !== today) {
      _notifiedIds = new Set();
      localStorage.setItem('fc_last_notify_date', today);
    }
  } catch(e) {}
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  selectNotifyTasks(state.tasks, _currentMember()).forEach(t => {
    if (_notifiedIds.has(t.id)) return;
    _notifiedIds.add(t.id);
    new Notification('FamilyFlow', { body: t.name + ' is overdue', icon: '' });
  });
}

export function _resetForTests() { _notifiedIds = new Set(); _started = false; _currentMember = () => ''; }

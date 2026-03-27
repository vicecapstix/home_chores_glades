import { state } from './state.js';
import { dueStatus } from './utils.js';

let _notifiedIds = new Set();
let _started = false;

export function requestNotificationPermission() {
  if (!('Notification' in window)) { scheduleOverdueCheck(); return; }
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  scheduleOverdueCheck();
}

function scheduleOverdueCheck() {
  if (_started) return;
  _started = true;
  runOverdueCheck();
  setInterval(runOverdueCheck, 30 * 60 * 1000);
}

function runOverdueCheck() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem('fc_last_notify_date') !== today) {
      _notifiedIds = new Set();
      localStorage.setItem('fc_last_notify_date', today);
    }
  } catch(e) {}
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  Object.values(state.tasks).forEach(t => {
    if (dueStatus(t) === 'overdue' && !t.done && !_notifiedIds.has(t.id)) {
      _notifiedIds.add(t.id);
      new Notification('FamilyChores', { body: t.name + ' is overdue', icon: '' });
    }
  });
}

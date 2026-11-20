// Backup reminder (#359): admin-only banner when this device has not downloaded a backup for 30 days.
// Device-local (localStorage with an in-memory fallback), display only: no Firebase access.
import { state } from './state.js';
import { READONLY } from './config.js';

export const REMIND_AFTER_DAYS = 30;
export const SNOOZE_DAYS = 7;
const DAY = 86400000;
const K_LAST = 'ff_backup_last', K_SNOOZE = 'ff_backup_snooze';
const mem = {}; // used when storage is blocked, so a dismiss still holds for this session

export function _resetBackupReminder() { delete mem[K_LAST]; delete mem[K_SNOOZE]; }

function read(k) {
  try { const v = Number(localStorage.getItem(k)); if (Number.isFinite(v) && v > 0) return v; } catch (e) { /* storage blocked */ }
  return mem[k] || 0;
}
function write(k, v) {
  mem[k] = v;
  try { localStorage.setItem(k, String(v)); } catch (e) { /* storage blocked */ }
}

// Pure: { show, days } (days = whole days since the last backup, null = never).
export function reminderStatus(last, snoozeUntil, now = Date.now()) {
  const days = last ? Math.max(0, Math.floor((now - last) / DAY)) : null;
  return { show: (days === null || days >= REMIND_AFTER_DAYS) && !(snoozeUntil && now < snoozeUntil), days };
}

export function markBackupDone(now = Date.now()) {
  write(K_LAST, now);
  hideBackupReminder();
}

export function hideBackupReminder() {
  const el = document.getElementById('backup-reminder');
  if (el) el.classList.add('hidden');
}

export function dismissBackupReminder(now = Date.now()) {
  if (READONLY) return;
  write(K_SNOOZE, now + SNOOZE_DAYS * DAY);
  hideBackupReminder();
}

export function renderBackupReminder(isAdminFn, now = Date.now()) {
  const el = document.getElementById('backup-reminder');
  if (!el) return;
  // Nothing to back up on a brand-new family; never for members or the TV.
  if (READONLY || !isAdminFn() || !Object.keys(state.tasks || {}).length) { hideBackupReminder(); return; }
  const st = reminderStatus(read(K_LAST), read(K_SNOOZE), now);
  if (!st.show) { hideBackupReminder(); return; }
  const txt = document.getElementById('backup-reminder-text');
  if (txt) txt.textContent = st.days === null ? 'No backup downloaded on this device yet.' : 'Last backup: ' + st.days + ' days ago.';
  el.classList.remove('hidden');
}

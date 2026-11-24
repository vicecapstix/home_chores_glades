// Quiet hours for chore notifications (#401): a device-local window (default 21:00-07:00, crossing
// midnight) in which overdue / due-time / "to check" notifications are held back. localStorage only,
// nothing in /state. `ff_quiet_held` remembers that something was held so wake-up sends one summary.
import { READONLY } from './config.js';

const KEY = 'ff_quiet', HELD = 'ff_quiet_held';
export const DEFAULT_QUIET = { on: true, start: 21 * 60, end: 7 * 60 };
const okMin = n => Number.isInteger(n) && n >= 0 && n < 1440;
const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

export function getQuiet() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v === 'object') return { on: v.on !== false, start: okMin(v.start) ? v.start : DEFAULT_QUIET.start, end: okMin(v.end) ? v.end : DEFAULT_QUIET.end };
  } catch (e) { /* corrupt or blocked: use the default */ }
  return { ...DEFAULT_QUIET };
}

export function inQuietHours(now = Date.now(), cfg = getQuiet()) {
  if (!cfg.on || cfg.start === cfg.end) return false;
  const d = new Date(now), m = d.getHours() * 60 + d.getMinutes();
  return cfg.start < cfg.end ? m >= cfg.start && m < cfg.end : m >= cfg.start || m < cfg.end;
}

export const isHeld = () => { try { return localStorage.getItem(HELD) === '1'; } catch (e) { return false; } };
export function setHeld(on) { try { if (on) localStorage.setItem(HELD, '1'); else localStorage.removeItem(HELD); } catch (e) { /* storage blocked */ } }

export function syncQuietButton() {
  const btn = document.getElementById('btn-quiet');
  if (!btn) return;
  const granted = !READONLY && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  btn.classList.toggle('hidden', !granted);
  const q = getQuiet();
  const text = 'Quiet hours ' + fmt(q.start) + '-' + fmt(q.end) + ': ' + (q.on ? 'on. Tap to turn off' : 'off. Tap to turn on');
  btn.textContent = q.on ? '🔕' : '🔔';
  btn.title = text; btn.setAttribute('aria-label', text);
}

export function toggleQuietHours() {
  if (READONLY) return getQuiet().on;
  const q = getQuiet(); q.on = !q.on;
  try { localStorage.setItem(KEY, JSON.stringify(q)); } catch (e) { /* storage blocked: nothing saved */ }
  syncQuietButton();
  return q.on;
}

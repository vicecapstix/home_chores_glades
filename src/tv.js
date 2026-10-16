// TV dashboard helpers for ?readonly=1 — display only, no Firebase access.
import { state, getMembers } from './state.js';
import { PCOLS, READONLY } from './config.js';
import { esc, avatarPrefix, currentWeekPoints } from './utils.js';

export function applyTvMode(readonly, body = document.body) {
  body.classList.toggle('tv', !!readonly);
  return !!readonly;
}

export function formatClock(d = new Date()) {
  return {
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

export function updateClock(d = new Date()) {
  const el = document.getElementById('tv-clock');
  if (!el) return;
  const { time, date } = formatClock(d);
  el.innerHTML = '<span class="tv-time">' + esc(time) + '</span><span class="tv-date">' + esc(date) + '</span>';
}

export function tvStripHTML(members = state.members) {
  const names = getMembers();
  const sorted = Object.values(members).slice().sort((a, b) => currentWeekPoints(b) - currentWeekPoints(a));
  return sorted.map(m => {
    const i = names.indexOf(m.name);
    const c = PCOLS[(i < 0 ? 0 : i) % PCOLS.length];
    return '<span class="tv-chip" style="background:' + c.bg + ';color:' + c.text + ';">' +
      esc(avatarPrefix(m)) + esc(m.name) + ' <b>' + currentWeekPoints(m) + '</b> pts' +
      ((m.streak || 0) > 0 ? ' 🔥' + m.streak : '') + '</span>';
  }).join('');
}

export function renderTvStrip() {
  if (!READONLY) return;
  const el = document.getElementById('tv-strip');
  if (el) el.innerHTML = tvStripHTML();
}

let _lock = null;
export async function requestWakeLock(nav = globalThis.navigator) {
  try {
    if (!nav || !nav.wakeLock || typeof nav.wakeLock.request !== 'function') return null;
    _lock = await nav.wakeLock.request('screen');
    return _lock;
  } catch (e) {
    return null; // denied / unsupported — screen may sleep, nothing else breaks
  }
}

export function initTvMode() {
  if (!applyTvMode(READONLY)) return;
  updateClock();
  setInterval(updateClock, 15000);
  requestWakeLock();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestWakeLock();
  });
}

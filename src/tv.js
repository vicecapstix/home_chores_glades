// TV dashboard helpers for ?readonly=1 — display only, no Firebase access.
import { state, getMembers, memberColor } from './state.js';
import { PCOLS, READONLY } from './config.js';
import { awayText, esc, avatarPrefix, currentWeekPoints, currentStreak, lastWeekChampion, goalHTML } from './utils.js';

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

export function tvChampionHTML(history = state.history) {
  const c = lastWeekChampion(history);
  if (!c.names.length) return '';
  return '<span class="tv-champ">🏆 Last week: ' + c.names.map(esc).join(' & ') + ' — ' + c.points + ' pts</span>';
}

export function tvStripHTML(members = state.members, history = state.history, rewards = state.rewards) {
  const names = getMembers();
  const sorted = Object.values(members).slice().sort((a, b) => currentWeekPoints(b) - currentWeekPoints(a));
  return sorted.map(m => {
    const c = memberColor(m.name, names) || PCOLS[0];
    return '<span class="tv-chip" style="background:' + c.bg + ';color:' + c.text + ';">' +
      esc(avatarPrefix(m)) + esc(m.name) + ' <b>' + currentWeekPoints(m) + '</b> pts' +
      (currentStreak(m) > 0 ? ' 🔥' + currentStreak(m) : '') + (awayText(m) ? ' <span class="chip-away">' + esc(awayText(m)) + '</span>' : '') + goalHTML(m, rewards) + '</span>';
  }).join('') + tvChampionHTML(history);
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

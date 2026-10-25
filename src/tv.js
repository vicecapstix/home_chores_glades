// TV dashboard helpers for ?readonly=1 — display only, no Firebase access.
import { state, getMembers } from './state.js';
import { PCOLS, READONLY, TV_CYCLE } from './config.js';
import { esc, avatarPrefix, currentWeekPoints, currentStreak, lastWeekChampion, goalHTML } from './utils.js';

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
    const i = names.indexOf(m.name);
    const c = PCOLS[(i < 0 ? 0 : i) % PCOLS.length];
    return '<span class="tv-chip" style="background:' + c.bg + ';color:' + c.text + ';">' +
      esc(avatarPrefix(m)) + esc(m.name) + ' <b>' + currentWeekPoints(m) + '</b> pts' +
      (currentStreak(m) > 0 ? ' 🔥' + currentStreak(m) : '') + goalHTML(m, rewards) + '</span>';
  }).join('') + tvChampionHTML(history);
}

export function renderTvStrip() {
  if (!READONLY) return;
  const el = document.getElementById('tv-strip');
  if (el) el.innerHTML = tvStripHTML();
}

// ── TV auto-cycle (#148): ?readonly=1&cycle=1 rotates Chores -> Leaderboard -> Rewards ──────────
// Display only: panels are built from already-synced state by injected helpers; no Firebase access.
export const CYCLE_MS = 30000, KEY_PAUSE_MS = 120000;
export const PANELS = ['chores', 'leaderboard', 'rewards'];
const PANEL_TITLES = { leaderboard: '🏆 Leaderboard', rewards: '🎁 Rewards' };

export function createTvCycle({ panelHTML, body = document.body, now = () => Date.now() }) {
  let idx = 0, pausedUntil = 0, timer = null;
  const el = () => document.getElementById('tv-panel');
  function show() {
    const name = PANELS[idx], panel = el();
    body.classList.toggle('tv-panel-on', name !== 'chores');
    if (!panel) return;
    panel.classList.toggle('hidden', name === 'chores');
    panel.setAttribute('aria-label', PANEL_TITLES[name] || 'Chores');
    panel.innerHTML = name === 'chores' ? '' : '<h2 class="tv-panel-title">' + esc(PANEL_TITLES[name]) + '</h2>' + panelHTML(name);
    panel.classList.remove('tv-slide'); void panel.offsetWidth; panel.classList.add('tv-slide'); // CSS drops the animation under prefers-reduced-motion
  }
  const go = n => { idx = (n + PANELS.length) % PANELS.length; show(); };
  function onKey(e) {
    pausedUntil = now() + KEY_PAUSE_MS;
    if (e.key === 'ArrowRight') go(idx + 1);
    else if (e.key === 'ArrowLeft') go(idx - 1);
  }
  function tick() { if (now() >= pausedUntil) go(idx + 1); }
  return {
    start() { show(); timer = setInterval(tick, CYCLE_MS); document.addEventListener('keydown', onKey); },
    stop() { clearInterval(timer); document.removeEventListener('keydown', onKey); },
    refresh: show, // re-render the current panel after a data snapshot
    current: () => PANELS[idx],
  };
}

let _cycle = null;
export function initTvCycle(panelHTML) {
  if (!READONLY || !TV_CYCLE) return null;
  _cycle = createTvCycle({ panelHTML });
  _cycle.start();
  return _cycle;
}
export function refreshTvCycle() { if (_cycle) _cycle.refresh(); }

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

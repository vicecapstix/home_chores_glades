// TV dashboard helpers for ?readonly=1 — display only, no Firebase access.
import { state, getMembers, memberColor } from './state.js';
import { PCOLS, READONLY, TV_CYCLE, TV_MEMBER } from './config.js';
import { owedHTML } from './pocketmoney.js';
import { awayText, esc, avatarPrefix, currentWeekPoints, currentStreak, freezeTag, lastWeekChampion, goalHTML, weekPlan, localDateStr, DAY_NAMES } from './utils.js';

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

// One-member tablet view (#398): ?readonly=1&member=Bo. Returns the real member name (exact, then
// case-insensitive) or '' for empty/unknown/not-yet-loaded, which means the full board. Display only.
export function tvMember(members = state.members, raw = TV_MEMBER) {
  const want = String(raw || '').trim();
  if (!want || !members) return '';
  if (members[want]) return want;
  return Object.keys(members).find(n => n.toLowerCase() === want.toLowerCase()) || '';
}
// That member's chores plus 'Anyone' chores; everything when no member is chosen.
export function tvMemberTasks(tasks, name) { return name ? tasks.filter(t => !t.person || t.person === name) : tasks; }

export function tvStripHTML(members = state.members, history = state.history, rewards = state.rewards) {
  const names = getMembers();
  const only = tvMember(members);
  const sorted = Object.values(members).filter(m => !only || m.name === only).slice().sort((a, b) => currentWeekPoints(b) - currentWeekPoints(a));
  return sorted.map(m => {
    const c = memberColor(m.name, names) || PCOLS[0];
    return '<span class="tv-chip" style="background:' + c.bg + ';color:' + c.text + ';">' +
      esc(avatarPrefix(m)) + esc(m.name) + ' <b>' + currentWeekPoints(m) + '</b> pts' +
      (currentStreak(m) > 0 ? ' 🔥' + currentStreak(m) + freezeTag(m) : '') + (awayText(m) ? ' <span class="chip-away">' + esc(awayText(m)) + '</span>' : '') + goalHTML(m, rewards) + owedHTML(m) + '</span>';
  }).join('') + (only ? '' : tvChampionHTML(history));
}

export function renderTvStrip() {
  if (!READONLY) return;
  const el = document.getElementById('tv-strip');
  if (el) el.innerHTML = tvStripHTML();
}

// ── TV "Tomorrow" panel (#355): from 18:00 local, the chores due tomorrow (same weekPlan as This week) ──
// Display only: built from synced state, no Firebase access, nothing stored. Away members are not
// filtered, exactly like This week.
export const TOMORROW_FROM = 18, TOMORROW_MAX = 12;
export function tomorrowDay(tasks = state.tasks, now = Date.now()) {
  const d = new Date(now); d.setDate(d.getDate() + 1);
  // Plan "as of tomorrow": the week containing it (Sunday evening included), with switch-off and
  // pause judged on tomorrow's date. Chores still overdue tonight are due then too.
  return weekPlan(tasks, d.getTime()).find(x => x.isToday);
}
export function tvTomorrowHTML(tasks = state.tasks, now = Date.now()) {
  if (new Date(now).getHours() < TOMORROW_FROM) return '';
  const day = tomorrowDay(tasks, now);
  if (!day) return '';
  const shown = day.items.slice(0, TOMORROW_MAX), more = day.items.length - shown.length;
  const chips = shown.map(it => {
    const c = memberColor(it.person) || { bg: 'var(--bg)', text: 'var(--muted)' };
    const who = it.person ? avatarPrefix(state.members[it.person]) + it.person : 'Anyone';
    return '<li class="tv-tom-item"><span class="tv-tom-name">' + (it.dueTime ? '<b>' + esc(it.dueTime) + '</b> ' : '') + esc(it.icon || '') + esc(it.name) +
      '</span><span class="lb-name wk-who" style="background:' + c.bg + ';color:' + c.text + '">' + esc(who) + '</span></li>';
  }).join('');
  return '<h2 class="tv-tom-title">🌙 Tomorrow, ' + esc(DAY_NAMES[day.dow]) + '</h2>' +
    (day.paused ? '<div class="empty">⏸ Paused</div>' : chips ? '<ul>' + chips + (more > 0 ? '<li class="tv-tom-more">+' + more + ' more</li>' : '') + '</ul>' : '<div class="empty">Nothing due</div>');
}
export function renderTvTomorrow(now = Date.now()) {
  if (!READONLY) return;
  const el = document.getElementById('tv-tomorrow');
  if (!el) return;
  const html = tvTomorrowHTML(state.tasks, now);
  if (el.innerHTML !== html) el.innerHTML = html; // the 1-min rollover tick calls this; skip no-op rewrites
}

// ── TV auto-cycle (#148): ?readonly=1&cycle=1 rotates Chores -> Leaderboard -> Rewards ──────────
// Display only: panels are built from already-synced state by injected helpers; no Firebase access.
export const CYCLE_MS = 30000, KEY_PAUSE_MS = 120000;
export const PANELS = ['chores', 'leaderboard', 'rewards'];
const PANEL_TITLES = { leaderboard: '🏆 Leaderboard', rewards: '🎁 Rewards' };

export function createTvCycle({ panelHTML, body = document.body, now = () => Date.now(), paused = () => false }) {
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
  function tick() {
    if (paused()) { if (idx !== 0) go(0); return; } // night mode (#315): rest on the chores screen
    if (now() >= pausedUntil) go(idx + 1);
  }
  return {
    start() { show(); timer = setInterval(tick, CYCLE_MS); document.addEventListener('keydown', onKey); },
    stop() { clearInterval(timer); document.removeEventListener('keydown', onKey); },
    refresh: show, // re-render the current panel after a data snapshot
    current: () => PANELS[idx],
  };
}

// ── TV night mode (#315): dim the screen 21:00-06:30 local and pause the auto-cycle ─────────────
// Display only: a body class, a local timer and a key/tap wake. No Firebase access, nothing stored.
export const NIGHT_START = 21 * 60, NIGHT_END = 6 * 60 + 30, WAKE_MS = 5 * 60000;
export function isNightTime(now = Date.now()) {
  const d = new Date(now), m = d.getHours() * 60 + d.getMinutes();
  return m >= NIGHT_START || m < NIGHT_END;
}
let _wakeUntil = 0, _dim = false;
export const isTvDim = () => _dim;
export function wakeTv(now = Date.now()) { _wakeUntil = now + WAKE_MS; updateTvNight(now); }
export function updateTvNight(now = Date.now(), body = document.body, readonly = READONLY) {
  _dim = !!readonly && isNightTime(now) && now >= _wakeUntil;
  body.classList.toggle('tv-night', _dim);
  return _dim;
}
export function initTvNight() {
  if (!READONLY) return;
  updateTvNight();
  ['keydown', 'pointerdown'].forEach(ev => document.addEventListener(ev, () => wakeTv()));
}

let _cycle = null;
export function initTvCycle(panelHTML) {
  if (!READONLY || !TV_CYCLE) return null;
  _cycle = createTvCycle({ panelHTML, paused: isTvDim });
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
  initTvNight();
  setInterval(updateClock, 15000);
  requestWakeLock();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestWakeLock();
  });
}

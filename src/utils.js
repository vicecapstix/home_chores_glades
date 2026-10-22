// Pure utility functions — no local imports, safe to import anywhere.

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Encode a value for use inside a single-quoted JS string that sits in a double-quoted
// HTML attribute (inline onclick). Everything outside [A-Za-z0-9 _-] becomes a \uXXXX escape.
export function jsq(s) {
  return String(s).replace(/[^A-Za-z0-9 _-]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

export async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const AVATARS = ['🦁', '🐯', '🐼', '🦊', '🐸', '🐵', '🐧', '🦄', '🐙', '🦖', '🐢', '🦋', '🚀', '⚽', '🎨', '🌈'];

// '<emoji> ' for a member with a valid avatar, else '' (tampered DB values are never rendered).
export function avatarPrefix(m) {
  return m && AVATARS.includes(m.avatar) ? m.avatar + ' ' : '';
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Start (local midnight, ms) of the most recent selected weekday that has begun (today or earlier), or null.
export function prevScheduledStart(days, now = Date.now()) {
  const sel = (days || []).map(Number).filter(d => d >= 0 && d <= 6);
  if (!sel.length) return null;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    if (sel.includes(d.getDay())) return d.getTime();
    d.setDate(d.getDate() - 1);
  }
  return null;
}

// lastDone value for a brand-new task so it is not instantly overdue.
export function initialLastDone(freq, now = Date.now()) {
  if (freq === 'weekdays') { // start of today minus 1 ms: due today if today is a scheduled day, never overdue for earlier days
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    return s.getTime() - 1;
  }
  const d = new Date(now);
  d.setDate(d.getDate() - freqDays(freq));
  return d.getTime();
}

// Rotation (#54): the chore's assignee advances through `rotation` on each reset.
// Names of members that no longer exist are skipped; fewer than 2 valid names = no rotation.
export function rotationList(rotation, memberNames) {
  const names = Array.isArray(rotation) ? rotation : Object.values(rotation || {});
  return names.filter((n, i) => typeof n === 'string' && memberNames.includes(n) && names.indexOf(n) === i);
}
export function nextRotationPerson(rotation, current, memberNames) {
  const list = rotationList(rotation, memberNames);
  if (list.length < 2) return null;
  const i = list.indexOf(current);
  return list[(i + 1) % list.length]; // not in the list (or unassigned): start at the first
}

// Small "🔁 next: Bo" tag for a rotating chore (display only; same logic as the reset).
export function rotationTag(t, memberNames) {
  if (!t.rotation || t.freq === 'once') return '';
  const next = nextRotationPerson(t.rotation, t.person, memberNames);
  return next ? '<span class="tag tag-freq" title="Rotates on reset">🔁 next: ' + esc(next) + '</span>' : '';
}

export function freqLabel(t) {
  return t.freq === 'weekdays'
    ? (t.days || []).map(Number).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DAY_NAMES[d]).join(', ') || 'No days'
    : t.freq;
}

export function freqDays(f) {
  return { daily: 1, weekly: 7, fortnightly: 14, monthly: 30 }[f] || 7;
}

// Whole local calendar days from `ts` to `now` (time of day ignored; DST-safe).
export function daysSince(ts, now = Date.now()) {
  const a = new Date(ts), b = new Date(now);
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
}

// Relative completion day for a done card: 'today' / 'yesterday' / 'N days ago'.
export function doneAgoLabel(ts, now = Date.now()) {
  const n = Math.max(0, daysSince(ts, now));
  return n === 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago';
}

// YYYY-MM-DD in the device's local time zone (toISOString would be UTC).
export function localDateStr(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Streak to display: stored streak only if the last completion was today or
// yesterday (local), otherwise 0. Display-only; never written back.
export function currentStreak(m, now = Date.now()) {
  if (!m || !m.streak || !m.lastStreakDate) return 0;
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const last = m.lastStreakDate;
  return (last === localDateStr(new Date(now)) || last === localDateStr(y)) ? m.streak : 0;
}

export function getWeekStart(from) {
  const d = from ? new Date(from) : new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return localDateStr(d);
}

// Local-time Monday (YYYY-MM-DD) of the week before the current one.
export function prevWeekStart(from) {
  const [y, m, d] = getWeekStart(from).split('-').map(Number);
  return localDateStr(new Date(y, m - 1, d - 7));
}

// Per-member points and completions for the local week starting on `weekStart`
// (Mon 00:00 to next Mon 00:00), computed from history. Members with nothing
// are omitted. Sorted by points desc, then name.
export function weekRecap(history, weekStart) {
  const [y, m, d] = String(weekStart).split('-').map(Number);
  const start = new Date(y, m - 1, d).getTime();
  const end = new Date(y, m - 1, d + 7).getTime();
  const by = {};
  (history || []).forEach(e => {
    if (!e || !e.person || !(e.completedAt >= start && e.completedAt < end)) return;
    const r = by[e.person] || (by[e.person] = { name: e.person, points: 0, count: 0 });
    r.points += e.points || 0;
    r.count++;
  });
  return Object.values(by).filter(r => r.points > 0 || r.count > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

// Last week's winner(s); ties are shared. truncated = the capped history may
// not reach back to the start of that week, so totals can be incomplete.
export function lastWeekChampion(history, from, cap = 500) {
  const ws = prevWeekStart(from);
  const rows = weekRecap(history, ws);
  const top = rows.length ? rows[0].points : 0;
  const [y, m, d] = ws.split('-').map(Number);
  const start = new Date(y, m - 1, d).getTime();
  const oldest = (history || []).reduce((mn, e) => Math.min(mn, e && e.completedAt ? e.completedAt : Infinity), Infinity);
  return {
    weekStart: ws, rows, points: top,
    names: rows.filter(r => r.points === top && top > 0).map(r => r.name),
    truncated: (history || []).length >= cap && oldest > start,
  };
}

// Points earned this week; stale (previous-week) totals count as 0.
export function currentWeekPoints(m) {
  return m && m.weekStart === getWeekStart() ? (m.weekPoints || 0) : 0;
}

export function taskPoints(t) {
  const base = { daily: 1, weekly: 3, weekdays: 3, fortnightly: 5, monthly: 8, once: 8 }[t.freq] || 1;
  const mult = { easy: 1, medium: 2, hard: 3 }[t.difficulty || 'easy'];
  return base * mult;
}

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export function validTime(v) { return TIME_RE.test(String(v || '')) ? String(v) : ''; }

// Local timestamp of `HH:MM` on local date `YYYY-MM-DD`.
function atTime(dateStr, hhmm) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(y, mo - 1, d, h, m, 0, 0).getTime();
}

// With a dueTime the deadline is a moment: overdue from then on, due soon in the 24h before.
let _pausedUntil = '';
export function setPauseUntil(d) { _pausedUntil = d || ''; }
export function isPausedNow(now = Date.now()) { return !!_pausedUntil && localDateStr(new Date(now)) <= _pausedUntil; }

export function dueStatus(t, now = Date.now()) {
  if (!t.done && isPausedNow(now)) return 'ok'; // holiday pause: nothing is due
  const s = rawDueStatus(t, now);
  // A skipped occurrence counts as on track until it would be overdue again.
  return isSkipped(t) && s !== 'overdue' ? 'ok' : s;
}

// Skipped = admin skipped this occurrence (lastDone was set to skippedAt) and it is not done since.
export function isSkipped(t) {
  return !t.done && !!t.skippedAt && t.skippedAt === t.lastDone && t.freq !== 'once';
}

function rawDueStatus(t, now) {
  const s = baseStatus(t, now);
  if (t.done || !validTime(t.dueTime) || s === 'done') return s;
  if (t.freq === 'weekdays') {
    // base 'soon' means a scheduled day that is today
    return s === 'soon' && now >= atTime(localDateStr(new Date(now)), t.dueTime) ? 'overdue' : s;
  }
  let dueDate;
  if (t.freq === 'once') {
    if (!t.dueDate) return s;
    dueDate = t.dueDate;
  } else {
    const d = new Date(t.lastDone || 0);
    d.setDate(d.getDate() + freqDays(t.freq));
    dueDate = localDateStr(d);
  }
  const due = atTime(dueDate, t.dueTime);
  return now >= due ? 'overdue' : now >= due - 86400000 ? 'soon' : 'ok';
}

function baseStatus(t, now = Date.now()) {
  if (t.done) return 'done';
  if (t.freq === 'once') {
    if (!t.dueDate) return 'ok';
    const d = new Date();
    const today = localDateStr(d);
    d.setDate(d.getDate() + 1);
    const soon = localDateStr(d);
    if (t.dueDate < today) return 'overdue';
    if (t.dueDate <= soon) return 'soon';
    return 'ok';
  }
  if (t.freq === 'weekdays') {
    const p = prevScheduledStart(t.days);
    if (p === null || (t.lastDone || 0) >= p) return 'ok';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return p === today.getTime() ? 'soon' : 'overdue';
  }
  const d = freqDays(t.freq), s = daysSince(t.lastDone || 0, now);
  if (s >= d) return 'overdue';
  if (s >= d - 1) return 'soon';
  return 'ok';
}

// Family daily goal: chores done today vs. those due today (overdue + due today + done today).
export function todayProgress(tasks, now = Date.now()) {
  const today = localDateStr(new Date(now));
  let done = 0, total = 0;
  for (const t of tasks || []) {
    if (t.done) {
      if (t.lastDone && localDateStr(new Date(t.lastDone)) === today) { done++; total++; }
      continue;
    }
    if (isSkipped(t)) continue;
    const s = dueStatus(t, now);
    const dueToday = t.freq === 'once' ? t.dueDate === today : t.freq === 'weekdays' && s === 'soon';
    if (s === 'overdue' || dueToday) total++;
  }
  return { done, total };
}

// "Mine" = assigned to me, or unclaimed; future (on-track) chores are left out.
export function isMine(t, me) {
  if (!me) return false;
  if (t.done) return t.person === me;
  return (!t.person || t.person === me) && dueStatus(t) !== 'ok';
}

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
  if ((freq && freq.freq || freq) === 'weekdays') { // start of today minus 1 ms: due today if today is a scheduled day, never overdue for earlier days
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    return s.getTime() - 1;
  }
  const d = new Date(now);
  if (freq === 'monthly') return addMonthClamped(d, -1).getTime(); // due today
  d.setDate(d.getDate() - freqDays(freq));
  return d.getTime();
}

// Same local time, `n` calendar months away; day clamped to that month's last day (31 Jan +1 → 28/29 Feb).
export function addMonthClamped(date, n) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d;
}

// Whole local days in the chore's cycle that started at `lastDone`. Monthly follows the calendar (#137).
export function cycleDays(f, lastDone) {
  const freq = f && typeof f === 'object' ? f.freq : f;
  if (freq !== 'monthly') return freqDays(f);
  return daysSince(lastDone || 0, addMonthClamped(new Date(lastDone || 0), 1).getTime());
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
    : t.freq === 'interval' ? 'Every ' + (validInterval(t.intervalDays) || 7) + ' days'
    : t.freq;
}

// "Every N days" recurrence (#145): a whole number from 2 to 60, else 0 (invalid).
export const INTERVAL_MIN = 2, INTERVAL_MAX = 60;
export function validInterval(n) {
  const v = typeof n === 'string' && n.trim() !== '' ? Number(n) : n;
  return Number.isInteger(v) && v >= INTERVAL_MIN && v <= INTERVAL_MAX ? v : 0;
}

// Days between occurrences. Takes a freq string, or a task/template entry so 'interval' can read intervalDays.
export function freqDays(f) {
  if (f && typeof f === 'object') {
    return f.freq === 'interval' ? (validInterval(f.intervalDays) || 7) : freqDays(f.freq);
  }
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
    if (e.type !== 'bonus') r.count++;
  });
  return Object.values(by).filter(r => r.points > 0 || r.count > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

// A member's last `n` local weeks (Monday start), oldest first, from history (#149).
// Bonus/deduction entries count in points only. partial = the capped history may not reach back
// to the start of that week, so its totals can be incomplete.
export function memberWeeks(history, member, now = Date.now(), n = 4, cap = 500) {
  const [y, m, d] = getWeekStart(now).split('-').map(Number);
  const list = history || [];
  const oldest = list.reduce((mn, e) => Math.min(mn, e && e.completedAt ? e.completedAt : Infinity), Infinity);
  const capped = list.length >= cap;
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(y, m - 1, d - 7 * i).getTime();
    const end = new Date(y, m - 1, d - 7 * i + 7).getTime();
    let points = 0, count = 0;
    list.forEach(e => {
      if (!e || e.person !== member || !(e.completedAt >= start && e.completedAt < end)) return;
      points += e.points || 0;
      if (e.type !== 'bonus') count++;
    });
    weeks.push({ weekStart: localDateStr(new Date(start)), points, count, partial: capped && oldest > start });
  }
  return weeks;
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
  const base = t.freq === 'interval'
    ? (n => n <= 2 ? 1 : n <= 7 ? 3 : n <= 14 ? 5 : 8)(freqDays(t))
    : { daily: 1, weekly: 3, weekdays: 3, fortnightly: 5, monthly: 8, once: 8 }[t.freq] || 1;
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

// A one-off chore ticked on an earlier local day: shown in the collapsed Done section (#142).
export function isStaleDoneOnce(t, now = Date.now()) {
  return t.freq === 'once' && !!t.done && !!t.lastDone && localDateStr(new Date(t.lastDone)) < localDateStr(new Date(now));
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
    d.setDate(d.getDate() + cycleDays(t, t.lastDone));
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
  const d = cycleDays(t, t.lastDone), s = daysSince(t.lastDone || 0, now);
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
    let dueToday = t.freq === 'once' ? t.dueDate === today : t.freq === 'weekdays' && s === 'soon';
    // Recurring chore with a due time: 'soon' until the time passes, but still due today (#161).
    if (!dueToday && s === 'soon' && t.freq !== 'once' && t.freq !== 'weekdays' && validTime(t.dueTime)) {
      const d = new Date(t.lastDone || 0);
      d.setDate(d.getDate() + cycleDays(t, t.lastDone));
      dueToday = localDateStr(d) === today;
    }
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

// Saving goal (#141): derived live from the member's points and the current reward,
// so a deleted reward or changed cost never leaves stale data. Returns null when unset/gone.
export function goalProgress(member, rewards) {
  const r = member && member.goalRewardId && rewards && rewards[member.goalRewardId];
  if (!r || !r.name || !(Number(r.cost) > 0)) return null;
  const points = Math.max(0, Number(member.points) || 0);
  const cost = Number(r.cost);
  return { reward: r, points, cost, pct: Math.min(100, Math.floor(points / cost * 100)), ready: points >= cost };
}

export function goalHTML(member, rewards) {
  const g = goalProgress(member, rewards);
  if (!g) return '';
  const shown = Math.min(g.points, g.cost);
  return '<span class="goal-wrap">' +
    '<span class="goal-text">🎯 ' + esc(g.reward.name) + ' ' + shown + '/' + g.cost +
    (g.ready ? ' <b>Ready to request!</b>' : '') + '</span>' +
    '<span class="goal-bar" role="progressbar" aria-label="' + esc('Goal: ' + g.reward.name) + '" aria-valuemin="0" aria-valuemax="' + g.cost +
    '" aria-valuenow="' + shown + '"><span class="goal-fill" style="width:' + g.pct + '%"></span></span></span>';
}

// Week planner (#143): Mon..Sun (local) of the week containing `now`, with the chores due each day.
// Display only. weekdays/daily repeat; weekly, fortnightly, monthly and "every N days" appear once on
// their next due date (overdue ones sit on today); one-offs on dueDate. Days under a holiday pause are empty.
export function weekPlan(tasks, now = Date.now()) {
  const todayStr = localDateStr(new Date(now));
  const [y, m, d0] = getWeekStart(now).split('-').map(Number);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(y, m - 1, d0 + i);
    const date = localDateStr(dt);
    days.push({ date, dow: dt.getDay(), isToday: date === todayStr, paused: !!_pausedUntil && date >= todayStr && date <= _pausedUntil, items: [] });
  }
  for (const t of Object.values(tasks || {})) {
    if (!t || !t.name) continue;
    const doneOn = t.done && t.lastDone ? localDateStr(new Date(t.lastDone)) : '';
    const item = day => ({ id: t.id, name: t.name, person: t.person || '', dueTime: validTime(t.dueTime), done: !!t.done && doneOn === day.date });
    if (t.freq === 'once') {
      if (t.done || !/^\d{4}-\d{2}-\d{2}$/.test(String(t.dueDate || ''))) continue;
      const day = days.find(x => x.date === (t.dueDate < todayStr ? todayStr : t.dueDate)); // overdue one-offs are due now
      if (day) day.items.push(item(day));
    } else if (t.freq === 'weekdays') {
      const sel = (t.days || []).map(Number);
      days.forEach(day => { if (sel.includes(day.dow)) day.items.push(item(day)); });
    } else if (t.freq === 'daily') {
      days.forEach(day => day.items.push(item(day)));
    } else {
      const due = new Date(t.lastDone || 0);
      due.setDate(due.getDate() + cycleDays(t, t.lastDone));
      let ds = localDateStr(due);
      if (ds < todayStr) ds = todayStr; // overdue: due now
      const day = days.find(x => x.date === ds);
      if (day) day.items.push(item(day));
    }
  }
  for (const day of days) {
    if (day.paused) day.items = [];
    day.items.sort((a, b) => (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99') || String(a.name).localeCompare(String(b.name)));
  }
  return days;
}

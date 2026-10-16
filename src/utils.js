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
  return freq === 'weekdays' ? now : now - freqDays(freq) * 86400000;
}

export function freqLabel(t) {
  return t.freq === 'weekdays'
    ? (t.days || []).map(Number).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DAY_NAMES[d]).join(', ') || 'No days'
    : t.freq;
}

export function freqDays(f) {
  return { daily: 1, weekly: 7, fortnightly: 14, monthly: 30 }[f] || 7;
}

export function daysSince(ts) {
  return Math.floor((Date.now() - ts) / 86400000);
}

// YYYY-MM-DD in the device's local time zone (toISOString would be UTC).
export function localDateStr(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return localDateStr(d);
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
export function dueStatus(t, now = Date.now()) {
  const s = baseStatus(t);
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

function baseStatus(t) {
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
  const d = freqDays(t.freq), s = daysSince(t.lastDone || 0);
  if (s >= d) return 'overdue';
  if (s >= d - 1) return 'soon';
  return 'ok';
}

// "Mine" = assigned to me, or unclaimed; future (on-track) chores are left out.
export function isMine(t, me) {
  if (!me) return false;
  if (t.done) return t.person === me;
  return (!t.person || t.person === me) && dueStatus(t) !== 'ok';
}

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

export function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

export function taskPoints(t) {
  const base = { daily: 1, weekly: 3, weekdays: 3, fortnightly: 5, monthly: 8, once: 8 }[t.freq] || 1;
  const mult = { easy: 1, medium: 2, hard: 3 }[t.difficulty || 'easy'];
  return base * mult;
}

export function dueStatus(t) {
  if (t.done) return 'done';
  if (t.freq === 'once') {
    if (!t.dueDate) return 'ok';
    const today = new Date().toISOString().slice(0, 10);
    const soon  = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
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

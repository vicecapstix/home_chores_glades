// Pure utility functions — no local imports, safe to import anywhere.

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
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
  const base = { daily: 1, weekly: 3, fortnightly: 5, monthly: 8, once: 8 }[t.freq] || 1;
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
  const d = freqDays(t.freq), s = daysSince(t.lastDone || 0);
  if (s >= d) return 'overdue';
  if (s >= d - 1) return 'soon';
  return 'ok';
}

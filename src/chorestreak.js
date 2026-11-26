// Per-chore streak (#361): "done in N periods in a row", computed at render time from the capped history.
// Display only: no writes, no stored fields.
import { state } from './state.js';
import { validInterval, validEveryWeeks } from './utils.js';

export const STREAK_MIN = 3;

const dayNum = ts => { const d = new Date(ts); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
const weekNum = n => Math.floor((n + 3) / 7); // 1970-01-01 was a Thursday; weeks start Monday
const dowOf = n => (n + 4) % 7;               // 0 = Sunday

function periodKey(t, ts) {
  const n = dayNum(ts);
  switch (t.freq) {
    case 'daily': case 'weekdays': return n;
    case 'weekly': return weekNum(n);
    case 'fortnightly': return Math.floor(weekNum(n) / 2);
    case 'monthly': { const d = new Date(ts); return d.getFullYear() * 12 + d.getMonth(); }
    case 'interval': return Math.floor(n / (validInterval(t.intervalDays) || 7));
    default: return null;
  }
}

// True when no period was missed between earlier key `a` and later key `b` (b may be the current, still open period).
function noMiss(t, a, b) {
  if (t.freq !== 'weekdays') return b - a <= 1;
  const days = new Set((t.days || []).map(Number));
  for (let n = a + 1; n < b; n++) if (days.has(dowOf(n))) return false;
  return true;
}

// Pure. `times` = completion timestamps (any order) for this chore. Returns the run length ending at the latest completion,
// or 0 when that run is already broken (a whole period passed since) or the chore isn't a repeating one.
export function choreStreak(t, times, now = Date.now()) {
  if (!t || !times || !times.length) return 0;
  if (t.freq === 'once' || (t.freq === 'weekdays' && (validEveryWeeks(t.everyWeeks) > 1 || !(t.days || []).length))) return 0;
  const keys = [...new Set(times.map(x => periodKey(t, x)))].filter(k => k != null).sort((a, b) => b - a);
  if (!keys.length) return 0;
  const cur = periodKey(t, now);
  if (cur == null || keys[0] > cur) return 0;
  if (keys[0] < cur && !noMiss(t, keys[0], cur)) return 0;
  let run = 1;
  while (run < keys.length && (t.freq === 'weekdays' ? noMiss(t, keys[run], keys[run - 1]) : keys[run - 1] - keys[run] === 1)) run++;
  return run;
}

let _hist = null, _len = -1, _idx = null;
function completionsFor(id) {
  const h = Array.isArray(state.history) ? state.history : [];
  if (h !== _hist || h.length !== _len) {
    _hist = h; _len = h.length; _idx = new Map();
    h.forEach(e => {
      if (!e || e.type || !e.taskId || !Number.isFinite(e.completedAt)) return;
      (_idx.get(e.taskId) || _idx.set(e.taskId, []).get(e.taskId)).push(e.completedAt);
    });
  }
  return _idx.get(id) || [];
}

const UNIT = { daily: 'day', weekdays: 'scheduled day', weekly: 'week', fortnightly: 'fortnight', monthly: 'month', interval: 'period' };

// '' when the streak is under STREAK_MIN. Built from numbers and a fixed word list only.
export function streakTag(t, now = Date.now()) {
  const n = choreStreak(t, completionsFor(t.id), now);
  if (n < STREAK_MIN) return '';
  return '<span class="tag tag-ok" title="Done in ' + n + ' ' + (UNIT[t.freq] || 'period') + 's in a row (counted from the last 500 history entries, so older streaks may show lower)">🔁 ' + n + ' in a row</span>';
}

// Printable weekly chart (#182): chores grouped by member, a box per due day.
// Browser print only; computed from local state, no Firebase access.
import { state, getMembers } from './state.js';
import { READONLY } from './config.js';
import { esc, getWeekStart, localDateStr } from './utils.js';

export const CHART_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// The 7 local dates (YYYY-MM-DD) Monday..Sunday of the week starting `weekStart`.
export function weekDates(weekStart) {
  const [y, m, d] = weekStart.split('-').map(Number);
  return CHART_DAYS.map((_, i) => localDateStr(new Date(y, m - 1, d + i)));
}

// Pure due-day logic. Returns { days: boolean[7] (Mon..Sun), anyDay }.
// daily: every day; weekdays: the chosen days; once: its due date if in this
// week; weekly/fortnightly/monthly/interval: no fixed day, so "any day".
export function dueDays(t, dates) {
  const days = [false, false, false, false, false, false, false];
  if (!t) return { days, anyDay: false };
  if (t.freq === 'daily') return { days: days.map(() => true), anyDay: false };
  if (t.freq === 'weekdays') {
    (t.days || []).map(Number).forEach(d => { if (d >= 0 && d <= 6) days[(d + 6) % 7] = true; });
    return { days, anyDay: false };
  }
  if (t.freq === 'once') {
    const i = dates.indexOf(t.dueDate);
    if (i >= 0) days[i] = true;
    return { days, anyDay: false };
  }
  return { days, anyDay: true };
}

// Groups tasks by member (members first, then "Anyone"); skips groups with no rows.
export function chartRows(tasks, members, weekStart) {
  const dates = weekDates(weekStart);
  const groups = members.concat(['']).map(person => {
    const rows = Object.values(tasks || {})
      .filter(t => t && (t.person || '') === person)
      .map(t => ({ task: t, ...dueDays(t, dates) }))
      .filter(r => r.anyDay || r.days.some(Boolean))
      .sort((a, b) => (a.task.order || 0) - (b.task.order || 0) || String(a.task.name).localeCompare(String(b.task.name)));
    return { person, rows };
  });
  return groups.filter(g => g.rows.length);
}

function rangeLabel(dates) {
  const f = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const a = f(dates[0]), b = f(dates[6]);
  return a.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' – ' +
    b.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function chartHTML(tasks, members, weekStart) {
  const dates = weekDates(weekStart);
  const groups = chartRows(tasks, members, weekStart);
  let html = '<h1 class="pc-title">FamilyFlow weekly chart</h1><p class="pc-week">Week of ' + esc(rangeLabel(dates)) + '</p>';
  if (!groups.length) return html + '<p>No chores scheduled this week.</p>';
  html += '<table class="pc-table"><thead><tr><th scope="col">Chore</th>' +
    CHART_DAYS.map((d, i) => '<th scope="col">' + d + '<br><small>' + esc(dates[i].slice(8)) + '</small></th>').join('') +
    '<th scope="col">Any day</th></tr></thead>';
  groups.forEach(g => {
    html += '<tbody><tr class="pc-person"><th colspan="9" scope="colgroup">' + esc(g.person || 'Anyone') + '</th></tr>';
    g.rows.forEach(r => {
      html += '<tr><th scope="row">' + esc(r.task.name) + '</th>' +
        r.days.map(on => '<td>' + (on ? '<span class="pc-box" aria-label="due"></span>' : '') + '</td>').join('') +
        '<td>' + (r.anyDay ? '<span class="pc-box" aria-label="due any day"></span>' : '') + '</td></tr>';
    });
    html += '</tbody>';
  });
  return html + '</table>';
}

// Admin-only. Fills the hidden #print-chart block, then opens the browser print dialog.
export function printChart(isAdminFn, doc = document) {
  if (READONLY || !isAdminFn()) return;
  const el = doc.getElementById('print-chart');
  if (!el) return;
  el.innerHTML = chartHTML(state.tasks, getMembers(), getWeekStart());
  if (typeof window !== 'undefined' && window.print) window.print();
}

// Fairness report (#226): admin-only view of who did how much over the last 28 days.
// Computed from the capped state.history; nothing is stored or written.
import { state, getMembers } from './state.js';
import { READONLY } from './config.js';
import { openModal } from './modals.js';
import { esc } from './utils.js';

export const FAIR_DAYS = 28;
export const FAIR_BAND = 0.3; // more than 30% above/below the family average is highlighted

// Pure. Chore completions only (entries with a `type` are bonuses/rewards). 'Anyone' = the
// task has no assigned person now. flag: 'high' | 'low' | ''.
export function fairnessReport(history, tasks, names, now = Date.now(), cap = 500) {
  const from = now - FAIR_DAYS * 86400000;
  const by = {};
  names.forEach(n => { by[n] = { name: n, points: 0, count: 0, anyone: 0, flag: '' }; });
  (history || []).forEach(e => {
    if (!e || e.type || !by[e.person] || !(e.completedAt >= from && e.completedAt <= now)) return;
    const r = by[e.person];
    r.points += e.points || 0;
    r.count++;
    const t = tasks && tasks[e.taskId];
    if (t && !t.person) r.anyone++;
  });
  const rows = names.map(n => by[n]);
  const avg = rows.length ? rows.reduce((s, r) => s + r.points, 0) / rows.length : 0;
  if (avg > 0) rows.forEach(r => { r.flag = r.points > avg * (1 + FAIR_BAND) ? 'high' : r.points < avg * (1 - FAIR_BAND) ? 'low' : ''; });
  const list = history || [];
  const oldest = list.reduce((mn, e) => Math.min(mn, e && e.completedAt ? e.completedAt : Infinity), Infinity);
  return { rows: rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)), average: Math.round(avg * 10) / 10, partial: list.length >= cap && oldest > from };
}

export function fairnessHTML(rep) {
  if (!rep.rows.length) return '<div class="lb-note">No members yet.</div>';
  const max = Math.max(1, ...rep.rows.map(r => r.points));
  return '<div class="lb-note">Last ' + FAIR_DAYS + ' days · family average ' + esc(rep.average) + ' pts</div><ul class="prog-list">' +
    rep.rows.map(r => {
      const pct = Math.round(Math.max(0, r.points) / max * 100);
      const tag = r.flag === 'high' ? ' <span class="tag tag-soon">Doing a lot</span>' : r.flag === 'low' ? ' <span class="tag tag-overdue">Doing less</span>' : '';
      return '<li class="prog-row"><span class="prog-label">' + esc(r.name) + tag + '</span>' +
        '<span class="prog-bar" aria-hidden="true"><span class="prog-fill" style="width:' + pct + '%"></span></span>' +
        '<span class="prog-val">' + esc(r.points + ' pts, ' + r.count + (r.count === 1 ? ' chore' : ' chores') + ', ' + r.anyone + ' from "Anyone"') + '</span></li>';
    }).join('') + '</ul>' +
    (rep.partial ? '<div class="lb-note" role="note">Activity history is capped, so older days may be incomplete.</div>' : '');
}

export function openFairness(isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  document.getElementById('fairness-list').innerHTML = fairnessHTML(fairnessReport(state.history, state.tasks, getMembers()));
  openModal('fairness-modal');
}

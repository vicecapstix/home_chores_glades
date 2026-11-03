import { state, getMembers, memberColor } from './state.js';
import { openModal } from './modals.js';
import { esc, getWeekStart, prevWeekStart } from './utils.js';

export const HISTORY_LIMIT = 50;
let filter = '';
let choreFilter = '';
let periodFilter = 'all'; // 'all' | 'this' | 'last'
const FILTERED_LIMIT = 500; // a filtered view may exceed the unfiltered 50 (history is capped at 500)

// Newest-first completions, optionally for one member, capped at `limit`.
export function recentCompletions(history, member, limit = HISTORY_LIMIT) {
  return (history || [])
    .filter(e => e && e.completedAt && (!member || e.person === member))
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, limit);
}

// Redemption events (#180): the request debit and, if denied, the refund.
// Approved requests add no row beyond the original debit.
export function redemptionEvents(redemptions) {
  const out = [];
  Object.values(redemptions || {}).forEach(r => {
    if (!r || !r.member || !(r.cost > 0)) return;
    if (r.requestedAt) out.push({ completedAt: r.requestedAt, person: r.member, points: -r.cost, label: '🎁 ' + (r.rewardName || 'Reward') + ' (requested)' });
    if (r.status === 'denied' && r.decidedAt) out.push({ completedAt: r.decidedAt, person: r.member, points: r.cost, label: 'Refund: ' + (r.rewardName || 'Reward') + ' (denied)' });
  });
  return out;
}

// Completions, bonuses and reward events merged, newest first, optionally for
// one member, capped at `limit`. Computed from existing data; nothing stored.
// Local-time [from, to) ms bounds of the Mon-Sun week (#256); null for 'all'.
export function periodRange(period, now) {
  if (period !== 'this' && period !== 'last') return null;
  const at = (ymd, plus) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d + plus).getTime(); };
  const cur = getWeekStart(now);
  return period === 'this' ? [at(cur, 0), at(cur, 7)] : [at(prevWeekStart(now), 0), at(cur, 0)];
}

// Distinct chore names present in history (completions only), sorted.
export function choreNames(history) {
  const set = new Set();
  (history || []).forEach(e => { if (e && e.completedAt && e.type !== 'bonus' && e.taskName) set.add(e.taskName); });
  return [...set].sort((a, b) => a.localeCompare(b));
}

// opts: { chore, period, now } - combined (AND) with `member`. A chore filter
// keeps only completions of that chore (no bonus or reward rows).
export function historyEvents(history, redemptions, member, limit = HISTORY_LIMIT, opts = {}) {
  const range = periodRange(opts.period, opts.now);
  const done = (history || []).filter(e => e && e.completedAt)
    .map(e => ({ ...e, label: e.type === 'bonus' ? 'Bonus: ' + (e.reason || '') : (e.taskName || '') }));
  return done.concat(redemptionEvents(redemptions))
    .filter(e => !member || e.person === member)
    .filter(e => !opts.chore || (e.type !== 'bonus' && e.taskName === opts.chore))
    .filter(e => !range || (e.completedAt >= range[0] && e.completedAt < range[1]))
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, limit);
}

function when(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function historyHTML(history, members, member, redemptions, opts = {}) {
  const filtered = !!(member || opts.chore || (opts.period && opts.period !== 'all'));
  const rows = historyEvents(history, redemptions, member, filtered ? FILTERED_LIMIT : HISTORY_LIMIT, opts);
  if (!rows.length) return '<div class="empty">' + (filtered ? 'Nothing here yet.' : 'No completions yet.') + '</div>';
  return rows.map(e => {
    const c = memberColor(e.person, members) || { bg: 'var(--bg)', text: 'var(--muted)' };
    return '<div class="hist-row">' +
      '<span class="lb-name hist-who" style="background:' + c.bg + ';color:' + c.text + '">' + esc(e.person || 'Anyone') + '</span>' +
      '<span class="hist-task">' + esc(e.label) + (e.checkedBy ? ' <span class="hist-checked">✓ checked by ' + esc(e.checkedBy) + '</span>' : '') + '</span>' +
      '<span class="hist-when">' + esc(when(e.completedAt)) + '</span>' +
      '<span class="hist-pts' + ((e.points || 0) < 0 ? ' neg' : '') + '">' + ((e.points || 0) > 0 ? '+' : '') + esc(String(e.points || 0)) + '</span>' +
      '</div>';
  }).join('');
}

export function renderHistory() {
  const members = getMembers();
  const pills = document.getElementById('history-filters');
  const list = document.getElementById('history-list');
  if (!pills || !list) return;
  pills.innerHTML = ['']
    .concat(members)
    .map(m => '<button class="lb-tab' + (m === filter ? ' active' : '') + '" aria-pressed="' + (m === filter) + '" data-member="' + esc(m) + '">' +
      (m ? esc(m) : 'Everyone') + '</button>').join('');
  const names = choreNames(state.history);
  if (choreFilter && !names.includes(choreFilter)) choreFilter = '';
  const chore = document.getElementById('history-chore');
  if (chore) chore.innerHTML = '<option value="">All chores</option>' +
    names.map(n => '<option value="' + esc(n) + '"' + (n === choreFilter ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
  const period = document.getElementById('history-period');
  if (period) period.value = periodFilter;
  list.innerHTML = historyHTML(state.history, members, filter, state.redemptions, { chore: choreFilter, period: periodFilter });
}

// Change handler for the chore / period selects (#256).
export function historyOptChange(el) {
  if (!el) return;
  if (el.id === 'history-chore') choreFilter = el.value || '';
  else if (el.id === 'history-period') periodFilter = ['this', 'last'].includes(el.value) ? el.value : 'all';
  renderHistory();
}

// Every open starts clean, so closing (or a different member logging in) never leaves a stale filter.
export function resetHistoryFilters() { filter = ''; choreFilter = ''; periodFilter = 'all'; }

export function setHistoryFilter(member) {
  filter = member || '';
  renderHistory();
}

// Click handler for the pill container: ignore clicks that miss a pill (gaps).
export function historyFilterClick(e) {
  const pill = e && e.target && e.target.closest ? e.target.closest('[data-member]') : null;
  if (!pill) return;
  setHistoryFilter(pill.dataset.member);
}

export function openHistory() {
  resetHistoryFilters();
  renderHistory();
  openModal('history-modal');
}

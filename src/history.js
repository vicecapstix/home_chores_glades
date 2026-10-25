import { state, getMembers } from './state.js';
import { PCOLS } from './config.js';
import { openModal } from './modals.js';
import { esc } from './utils.js';

export const HISTORY_LIMIT = 50;
let filter = '';

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
export function historyEvents(history, redemptions, member, limit = HISTORY_LIMIT) {
  const done = (history || []).filter(e => e && e.completedAt)
    .map(e => ({ ...e, label: e.type === 'bonus' ? 'Bonus: ' + (e.reason || '') : (e.taskName || '') }));
  return done.concat(redemptionEvents(redemptions))
    .filter(e => !member || e.person === member)
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, limit);
}

function when(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function historyHTML(history, members, member, redemptions) {
  const rows = historyEvents(history, redemptions, member);
  if (!rows.length) return '<div class="empty">No completions yet.</div>';
  return rows.map(e => {
    const i = members.indexOf(e.person);
    const c = i >= 0 ? PCOLS[i % PCOLS.length] : { bg: 'var(--bg)', text: 'var(--muted)' };
    return '<div class="hist-row">' +
      '<span class="lb-name hist-who" style="background:' + c.bg + ';color:' + c.text + '">' + esc(e.person || 'Anyone') + '</span>' +
      '<span class="hist-task">' + esc(e.label) + '</span>' +
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
    .map(m => '<button class="lb-tab' + (m === filter ? ' active' : '') + '" data-member="' + esc(m) + '">' +
      (m ? esc(m) : 'Everyone') + '</button>').join('');
  list.innerHTML = historyHTML(state.history, members, filter, state.redemptions);
}

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
  if (filter && !getMembers().includes(filter)) filter = '';
  renderHistory();
  openModal('history-modal');
}

// "This week" planner modal (#143) — display only, no Firebase access.
import { state, getMembers } from './state.js';
import { PCOLS } from './config.js';
import { openModal } from './modals.js';
import { esc, avatarPrefix, weekPlan, DAY_NAMES } from './utils.js';

function dayLabel(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export function weekHTML(tasks = state.tasks, now = Date.now()) {
  const names = getMembers();
  return weekPlan(tasks, now).map(day => {
    const rows = day.items.map(it => {
      const i = names.indexOf(it.person);
      const c = i >= 0 ? PCOLS[i % PCOLS.length] : { bg: 'var(--bg)', text: 'var(--muted)' };
      const who = it.person ? avatarPrefix(state.members[it.person]) + it.person : 'Anyone';
      return '<li class="wk-item' + (it.done ? ' wk-done' : '') + '">' +
        (it.dueTime ? '<span class="wk-time">' + esc(it.dueTime) + '</span>' : '') +
        '<span class="wk-name">' + (it.done ? '✓ ' : '') + esc(it.name) + '</span>' +
        '<span class="lb-name wk-who" style="background:' + c.bg + ';color:' + c.text + '">' + esc(who) + '</span></li>';
    }).join('');
    return '<section class="wk-day' + (day.isToday ? ' wk-today' : '') + '" aria-label="' + esc(dayLabel(day.date)) + '">' +
      '<h3>' + esc(DAY_NAMES[day.dow]) + (day.isToday ? ' <span class="wk-badge">Today</span>' : '') + '</h3>' +
      (day.paused ? '<div class="empty">⏸ Paused</div>' : rows ? '<ul>' + rows + '</ul>' : '<div class="empty">Nothing due</div>') +
      '</section>';
  }).join('');
}

export function renderWeek() {
  const el = document.getElementById('week-list');
  if (el) el.innerHTML = weekHTML();
}

export function openWeek() {
  renderWeek();
  openModal('week-modal');
}

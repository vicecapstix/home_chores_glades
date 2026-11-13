// "This week" planner modal (#143) — display only, no Firebase access.
import { state, memberColor } from './state.js';
import { openModal } from './modals.js';
import { esc, avatarPrefix, weekPlan, DAY_NAMES } from './utils.js';
import { ANYONE } from './weekics.js';

function dayLabel(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export function weekHTML(tasks = state.tasks, now = Date.now()) {
  return weekPlan(tasks, now).map(day => {
    const rows = day.items.map(it => {
      const c = memberColor(it.person) || { bg: 'var(--bg)', text: 'var(--muted)' };
      const who = it.person ? avatarPrefix(state.members[it.person]) + it.person : 'Anyone';
      return '<li class="wk-item' + (it.done ? ' wk-done' : '') + '">' +
        (it.dueTime ? '<span class="wk-time">' + esc(it.dueTime) + '</span>' : '') +
        '<span class="wk-name">' + (it.done ? '✓ ' : '') + esc(it.icon || '') + esc(it.name) + '</span>' +
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

function renderIcsWho() {
  const sel = document.getElementById('week-ics-who');
  if (!sel) return;
  const keep = sel.value;
  sel.innerHTML = '<option value="">Everyone</option><option value="' + ANYONE + '">Anyone (unassigned)</option>' +
    Object.keys(state.members || {}).map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
  sel.value = [...sel.options].some(o => o.value === keep) ? keep : '';
}

export function openWeek() {
  renderIcsWho();
  renderWeek();
  openModal('week-modal');
}

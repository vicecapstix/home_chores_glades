// "My progress" modal (#149): last 4 weeks of points and completions. Display only, computed from state.history.
import { state } from './state.js';
import { openModal } from './modals.js';
import { esc, memberWeeks } from './utils.js';

function weekName(ws) {
  const [y, m, d] = ws.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function progressHTML(history, member, now = Date.now()) {
  const weeks = memberWeeks(history, member, now);
  const max = Math.max(1, ...weeks.map(w => Math.abs(w.points)));
  return '<ul class="prog-list">' + weeks.map((w, i) => {
    const label = i === weeks.length - 1 ? 'This week' : 'Week of ' + weekName(w.weekStart);
    const pct = Math.round(Math.abs(w.points) / max * 100);
    return '<li class="prog-row">' +
      '<span class="prog-label">' + esc(label) + (w.partial ? ' <em class="prog-partial">(partial)</em>' : '') + '</span>' +
      '<span class="prog-bar" aria-hidden="true"><span class="prog-fill' + (w.points < 0 ? ' neg' : '') + '" style="width:' + pct + '%"></span></span>' +
      '<span class="prog-val">' + esc(w.points + ' pts, ' + w.count + (w.count === 1 ? ' chore' : ' chores')) + '</span></li>';
  }).join('') + '</ul>' +
    (weeks.some(w => w.partial) ? '<div class="lb-note" role="note">Activity history is capped, so older weeks may be incomplete.</div>' : '');
}

// Members see their own progress; admins can see anyone's.
export function openProgress(name, isAdminFn, currentMemberFn) {
  const me = currentMemberFn();
  if (!name || (name !== me && !isAdminFn())) return;
  document.getElementById('progress-title').textContent = '📈 Progress — ' + name;
  document.getElementById('progress-list').innerHTML = progressHTML(state.history, name);
  openModal('progress-modal');
}

// Bonus chore of the day (#360): the admin picks one chore and +1..+20 extra points for today.
// One tiny key, state/bonusChore {date, taskId, extra}; ignored once the date has passed.
import { state } from './state.js';
import { READONLY } from './config.js';
import { patchRoot } from './firebase.js';
import { showToast } from './ui.js';
import { esc, localDateStr } from './utils.js';

export const MAX_BONUS = 20;

// Pure: returns {date, taskId, extra} (for today) or null.
export function validBonusChore(taskId, extra, tasks = state.tasks, today = localDateStr()) {
  const e = Number(extra);
  if (!taskId || !tasks || !tasks[taskId] || !Number.isInteger(e) || e < 1 || e > MAX_BONUS) return null;
  return { date: today, taskId: String(taskId), extra: e };
}

// Pure: extra points this chore earns when ticked at `now` (0 unless it is the bonus chore today).
export function bonusFor(t, now = new Date(), bc = state.bonusChore) {
  if (!t || !bc || bc.taskId !== t.id || bc.date !== localDateStr(now)) return 0;
  const e = Number(bc.extra);
  return Number.isInteger(e) && e >= 1 && e <= MAX_BONUS ? e : 0;
}

// Admin only.
export async function setBonusChore(taskId, extra, isAdminFn) {
  if (READONLY || !isAdminFn()) return false;
  const v = validBonusChore(taskId, extra);
  if (!v) { showToast('Pick a chore and 1–' + MAX_BONUS + ' extra points'); return false; }
  try { await patchRoot({ bonusChore: v }); state.bonusChore = v; showToast('Bonus chore set for today'); return true; }
  catch (err) { showToast('Save failed: ' + (err.code || err.message)); return false; }
}

export async function clearBonusChore(isAdminFn) {
  if (READONLY || !isAdminFn()) return false;
  try { await patchRoot({ bonusChore: null }); state.bonusChore = null; showToast('Bonus chore cleared'); return true; }
  catch (err) { showToast('Save failed: ' + (err.code || err.message)); return false; }
}

export function bonusChoreAdminHTML() {
  const bc = state.bonusChore;
  const live = bc && bc.date === localDateStr() && state.tasks[bc.taskId];
  const opts = Object.values(state.tasks || {}).filter(t => t && t.id && t.name)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map(t => '<option value="' + esc(t.id) + '"' + (live && bc.taskId === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('');
  return '<div class="pause-admin"><div><b>Bonus chore today</b></div>' +
    '<label for="bc-task" class="sr-only">Chore</label><select id="bc-task">' + opts + '</select>' +
    '<label for="bc-extra" class="sr-only">Extra points</label>' +
    '<input type="number" id="bc-extra" min="1" max="' + MAX_BONUS + '" inputmode="numeric" placeholder="+pts" value="' + esc(live ? bc.extra : '') + '" />' +
    '<button class="btn-sm" onclick="window.setBonusChore()">Set</button>' +
    (live ? '<button class="btn-sm" onclick="window.clearBonusChore()">Clear</button>' : '') + '</div>';
}

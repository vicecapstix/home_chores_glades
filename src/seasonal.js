// Seasonal chores (#300): a chore can be switched off until a date (task.offUntil, YYYY-MM-DD, inclusive).
// While off it is never due (dueStatus) and does not reset. The first editing client to see the date pass
// switches it back on with one granular patch, like the house-pause resume. Readonly screens never write.
import { state } from './state.js';
import { READONLY } from './config.js';
import { patchPaths } from './firebase.js';
import { showToast } from './ui.js';
import { initialLastDone, isOffNow, localDateStr, validDateStr } from './utils.js';

let _busy = false;

export function checkOffExpiry(now = Date.now()) {
  if (READONLY || _busy) return;
  const today = localDateStr(new Date(now));
  const paths = {};
  Object.values(state.tasks || {}).forEach(t => {
    if (!validDateStr(t.offUntil) || today <= t.offUntil) return;
    paths['tasks/' + t.id + '/offUntil'] = null;
    if (t.freq !== 'once') paths['tasks/' + t.id + '/lastDone'] = t.lastDone = initialLastDone(t, now); // due that day
    delete t.offUntil;
  });
  if (!Object.keys(paths).length) return;
  _busy = true;
  patchPaths(paths).catch(err => showToast('Save failed: ' + (err.code || err.message))).finally(() => { _busy = false; });
}

// Admin: switch a chore back on before its date (#301). Same patch as the automatic switch-back.
export async function switchOnNow(id, isAdminFn, now = Date.now()) {
  if (READONLY || !isAdminFn()) return;
  const t = state.tasks && state.tasks[id];
  if (!t || !isOffNow(t, now)) return;
  const paths = { ['tasks/' + id + '/offUntil']: null };
  if (t.freq !== 'once' && !t.done) paths['tasks/' + id + '/lastDone'] = initialLastDone(t, now); // due today
  try {
    await patchPaths(paths);
    delete t.offUntil;
    if (paths['tasks/' + id + '/lastDone']) t.lastDone = paths['tasks/' + id + '/lastDone'];
    showToast('Switched on');
  } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

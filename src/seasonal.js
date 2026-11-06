// Seasonal chores (#300): a chore can be switched off until a date (task.offUntil, YYYY-MM-DD, inclusive).
// While off it is never due (dueStatus) and does not reset. The first editing client to see the date pass
// switches it back on with one granular patch, like the house-pause resume. Readonly screens never write.
import { state } from './state.js';
import { READONLY } from './config.js';
import { patchPaths } from './firebase.js';
import { showToast } from './ui.js';
import { initialLastDone, localDateStr, validDateStr } from './utils.js';

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

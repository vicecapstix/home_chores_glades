// Double-points day (#225): the admin picks one date and a x2/x3 multiplier.
// One tiny key, state/doublePoints {date, mult}; ignored once the date has passed.
import { state } from './state.js';
import { READONLY } from './config.js';
import { patchRoot } from './firebase.js';
import { showToast } from './ui.js';
import { esc, localDateStr } from './utils.js';

export const DOUBLE_MULTS = [2, 3];

// Pure: returns {date, mult} or null. Date must be a real YYYY-MM-DD, today or later.
export function validDoublePoints(date, mult, today = localDateStr()) {
  const d = String(date || '');
  const m = Number(mult);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !DOUBLE_MULTS.includes(m)) return null;
  const [y, mo, da] = d.split('-').map(Number);
  const real = new Date(y, mo - 1, da);
  if (real.getFullYear() !== y || real.getMonth() !== mo - 1 || real.getDate() !== da) return null;
  if (d < today) return null;
  return { date: d, mult: m };
}

// Pure: the multiplier in force at `now` (1 when there is no event today).
export function activeMultiplier(dp = state.doublePoints, now = new Date()) {
  if (!dp || !DOUBLE_MULTS.includes(Number(dp.mult))) return 1;
  return dp.date === localDateStr(now) ? Number(dp.mult) : 1;
}

export function renderDoublePointsBanner(dp = state.doublePoints, now = new Date()) {
  const el = document.getElementById('double-banner');
  if (!el) return;
  const mult = activeMultiplier(dp, now);
  el.classList.toggle('hidden', mult === 1);
  el.textContent = mult === 1 ? '' : '⭐ Double points today! Every chore earns ×' + mult;
}

// Admin only.
export async function setDoublePoints(date, mult, isAdminFn) {
  if (READONLY || !isAdminFn()) return false;
  const v = validDoublePoints(date, mult);
  if (!v) { showToast('Pick a date from today on, and ×2 or ×3'); return false; }
  try { await patchRoot({ doublePoints: v }); state.doublePoints = v; showToast('Double-points day set'); return true; }
  catch (err) { showToast('Save failed: ' + (err.code || err.message)); return false; }
}

export async function clearDoublePoints(isAdminFn) {
  if (READONLY || !isAdminFn()) return false;
  try { await patchRoot({ doublePoints: null }); state.doublePoints = null; showToast('Double-points day cleared'); return true; }
  catch (err) { showToast('Save failed: ' + (err.code || err.message)); return false; }
}

export function doublePointsAdminHTML() {
  const g = state.doublePoints;
  return '<div class="pause-admin"><div><b>Double-points day</b></div>' +
    '<label for="dp-date" class="sr-only">Date</label>' +
    '<input type="date" id="dp-date" min="' + esc(localDateStr()) + '" value="' + esc(g ? g.date : '') + '" />' +
    '<label for="dp-mult" class="sr-only">Multiplier</label>' +
    '<select id="dp-mult">' + DOUBLE_MULTS.map(m => '<option value="' + m + '"' + (g && Number(g.mult) === m ? ' selected' : '') + '>×' + m + '</option>').join('') + '</select>' +
    '<button class="btn-sm" onclick="window.setDoublePoints()">Set</button>' +
    (g ? '<button class="btn-sm" onclick="window.clearDoublePoints()">Clear</button>' : '') + '</div>';
}

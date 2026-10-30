import { state } from './state.js';
import { READONLY } from './config.js';
import { adjustMemberPoints, appendHistory, removeHistoryEntry } from './firebase.js';
import { showToast } from './ui.js';
import { pushUndo } from './undo.js';
import { writeBlocked } from './writegate.js';
import { getWeekStart } from './utils.js';

export const BONUS_MAX = 50;
export const BONUS_REASON_MAX = 60;

// '' when valid, otherwise a message for the admin.
export function validateBonus(amount, reason) {
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > BONUS_MAX) {
    return 'Amount must be a whole number from -' + BONUS_MAX + ' to +' + BONUS_MAX + ' (not 0)';
  }
  const r = String(reason || '').trim();
  if (!r) return 'Please give a reason';
  if (r.length > BONUS_REASON_MAX) return 'Reason must be ' + BONUS_REASON_MAX + ' characters or fewer';
  return '';
}

// Admin gives (+) or takes (-) points outside chores. Atomic on the live
// server value; awards and deductions both count toward this week (#221),
// which the transaction keeps at 0 or above. Undo gives the week back only
// what it actually moved (a deduction floored at 0 moved less than `amount`).
export async function adjustBonus(name, amount, reason, isAdminFn, currentMemberFn, confirmFn = confirm) {
  if (READONLY || !isAdminFn()) return false;
  if (!state.members[name]) return false;
  if (writeBlocked(showToast)) return false;
  amount = Number(amount);
  reason = String(reason || '').trim();
  const bad = validateBonus(amount, reason);
  if (bad) { showToast(bad); return false; }
  const opts = { pts: amount, count: 0, weekStart: getWeekStart(), countWeek: true };
  try {
    let r = await adjustMemberPoints(name, opts);
    if (!r.ok && r.reason === 'insufficient') {
      if (!confirmFn(name + ' has fewer than ' + (-amount) + ' points. Take them below 0?')) return false;
      r = await adjustMemberPoints(name, { ...opts, allowNegative: true });
    }
    if (!r.ok) { showToast('Points update failed'); return false; }
    const weekMoved = r.weekDelta ?? amount;
    const entry = { type: 'bonus', taskName: 'Bonus: ' + reason, person: name, points: amount, reason, by: currentMemberFn() || '', completedAt: Date.now() };
    await appendHistory(entry);
    pushUndo({
      label: (amount > 0 ? '+' : '') + amount + ' ' + name,
      verb: amount > 0 ? 'Awarded' : 'Deducted',
      undo: async () => {
        await adjustMemberPoints(name, { ...opts, pts: -amount, weekPts: -weekMoved, allowNegative: true });
        await removeHistoryEntry({ type: 'bonus', person: name, completedAt: entry.completedAt });
      },
    });
    return true;
  } catch (err) {
    showToast('Points update failed: ' + (err.code || err.message));
    return false;
  }
}

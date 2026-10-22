// Saving goal writes (#141): members pick one reward to save towards.
import { state } from './state.js';
import { READONLY } from './config.js';
import { patchMember } from './firebase.js';
import { showToast } from './ui.js';

// rewardId '' / null clears. Members may only change their own goal; admins anyone's.
export async function setGoal(target, rewardId, currentMemberFn, isAdminFn) {
  if (READONLY) return false;
  const m = state.members?.[target];
  if (!m) return false;
  if (target !== currentMemberFn() && !isAdminFn()) return false;
  if (rewardId && !state.rewards?.[rewardId]) return false;
  try {
    await patchMember(target, { goalRewardId: rewardId || null });
    if (rewardId) m.goalRewardId = rewardId; else delete m.goalRewardId;
    return true;
  } catch (err) {
    showToast('Goal failed: ' + (err.code || err.message));
    return false;
  }
}

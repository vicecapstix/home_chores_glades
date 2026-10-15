import { state } from './state.js';
import { READONLY } from './config.js';
import { patchRoot, spendPoints, refundPoints } from './firebase.js';
import { showToast } from './ui.js';
import { pushUndo } from './undo.js';

export const MAX_REDEMPTIONS = 100;
let busy = false;

export function pendingFor(member) {
  return Object.values(state.redemptions || {})
    .filter(r => r && r.status === 'pending' && (!member || r.member === member))
    .sort((a, b) => b.requestedAt - a.requestedAt);
}

// Ids to drop (oldest non-pending first) so one more entry fits under the cap.
export function idsToDrop(redemptions) {
  const all = Object.values(redemptions || {});
  const over = all.length - (MAX_REDEMPTIONS - 1);
  if (over <= 0) return [];
  return all.filter(r => r.status !== 'pending')
    .sort((a, b) => a.requestedAt - b.requestedAt)
    .slice(0, over).map(r => r.id);
}

export async function requestReward(rewardId, currentMemberFn) {
  if (READONLY || busy) return;
  const me = currentMemberFn();
  const m = me && state.members[me];
  const reward = state.rewards?.[rewardId];
  if (!m) { showToast('Select a member first'); return; }
  if (!reward) return;
  if ((m.points || 0) < reward.cost) { showToast('Not enough points'); return; }
  const drops = idsToDrop(state.redemptions);
  if (Object.keys(state.redemptions || {}).length - drops.length >= MAX_REDEMPTIONS) {
    showToast('Too many pending requests'); return;
  }
  busy = true;
  try {
    let ok;
    try { ok = await spendPoints(me, reward.cost); }
    catch (err) { showToast('Request failed: ' + (err.code || err.message)); return; }
    if (!ok) { showToast('Not enough points'); return; }
    const id = 'rd' + Date.now();
    const entry = { id, rewardId, rewardName: reward.name, cost: reward.cost, member: me, requestedAt: Date.now(), status: 'pending' };
    const fields = { ['redemptions/' + id]: entry };
    drops.forEach(d => { fields['redemptions/' + d] = null; });
    try { await patchRoot(fields); }
    catch (err) {
      await refundPoints(me, reward.cost).catch(() => {});
      showToast('Request failed: ' + (err.code || err.message));
      return;
    }
    if (!state.redemptions) state.redemptions = {};
    state.redemptions[id] = entry;
    drops.forEach(d => { delete state.redemptions[d]; });
    showToast('Requested ' + reward.name);
    pushUndo({
      label: reward.name, verb: 'Requested',
      undo: async () => {
        if (state.redemptions?.[id]?.status !== 'pending') throw new Error('Already processed');
        await patchRoot({ ['redemptions/' + id]: null });
        await refundPoints(me, reward.cost);
        delete state.redemptions[id];
      },
    });
  } finally { busy = false; }
}

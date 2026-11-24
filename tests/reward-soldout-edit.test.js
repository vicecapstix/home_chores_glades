import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

let denyReleaseFails = false;
vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), get READONLY() { return globalThis.__RO === true; } }));
vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  patchPaths: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined),
  spendPoints: vi.fn().mockResolvedValue(true),
  refundPoints: vi.fn().mockResolvedValue(undefined),
  decideRedemption: vi.fn().mockResolvedValue(true),
  takePendingRedemption: vi.fn().mockResolvedValue(true),
  reserveStock: vi.fn().mockResolvedValue(true),
  releaseStock: vi.fn(async () => { if (denyReleaseFails) throw new Error('boom'); }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import * as R from '../src/rewards.js';
import * as D from '../src/redemptions.js';

const admin = () => true;
const setForm = () => {
  document.body.innerHTML = '<input id="reward-name"><input id="reward-cost"><input id="reward-icon"><input id="reward-perweek"><input id="reward-stock"><button id="reward-save"></button><button id="reward-cancel"></button>';
};
beforeEach(() => {
  vi.clearAllMocks(); denyReleaseFails = false; globalThis.__RO = false; setForm();
  state.members = { Alice: { name: 'Alice', role: 'member', points: 100 } };
  state.rewards = { r1: { id: 'r1', name: 'Cinema', cost: 20, icon: '🎬', stock: 0 } };
  state.redemptions = { q: { id: 'q', rewardId: 'r1', rewardName: 'Cinema', cost: 20, member: 'Alice', status: 'pending' } };
});

describe('editing a sold-out reward (#357 lead-engineer blocker)', () => {
  it('validateReward accepts stock 0 (sold out)', () => {
    expect(R.validateReward('x', 5, '', '', '0').reward.stock).toBe(0);
    expect(R.validateReward('x', 5, '', '', '-1').error).toBeTruthy();
  });
  it('rename at stock 0 saves and keeps stock 0 (not silently unlimited)', async () => {
    R.editReward('r1', admin);
    expect(document.getElementById('reward-stock').value).toBe('0');
    document.getElementById('reward-name').value = 'Cinema trip';
    await R.saveReward(admin);
    expect(showToast).not.toHaveBeenCalled();
    expect(patchRoot.mock.calls[0][0]['rewards/r1/name']).toBe('Cinema trip');
    expect(patchRoot.mock.calls[0][0]).not.toHaveProperty('rewards/r1/stock'); // untouched, stays 0 (#390)
    expect(state.rewards.r1.stock).toBe(0);
  });
});

describe('failed stock release on deny is reported', () => {
  it('toasts when the copy could not be returned', async () => {
    denyReleaseFails = true;
    await D.decideRequest('q', 'denied', admin, () => 'Bob');
    expect(showToast.mock.calls.some(c => /stock/i.test(String(c[0])))).toBe(true);
  });
});

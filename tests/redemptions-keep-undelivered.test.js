// #217: a full redemption log must never drop a reward that was approved but not yet handed out.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  spendPoints: vi.fn(async () => true),
  refundPoints: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot, spendPoints } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import * as D from '../src/redemptions.js';

const mk = (n, status, extra = {}) => ({ id: 'x' + n, member: 'Bob', rewardName: 'r', cost: 1, requestedAt: n, status, ...extra });
const log = entries => Object.fromEntries(entries.map(e => [e.id, e]));

beforeEach(() => {
  vi.clearAllMocks();
  state.members = { Alice: { name: 'Alice', role: 'member', points: 50 } };
  state.rewards = { r1: { id: 'r1', name: 'Movie night', cost: 20, icon: 'x' } };
  state.redemptions = {};
});

describe('idsToDrop keeps undelivered rewards (AC1, AC2)', () => {
  it('never returns an approved reward that has not been given', () => {
    const all = [mk(0, 'approved'), ...Array.from({ length: 99 }, (_, i) => mk(i + 1, 'pending'))];
    expect(D.idsToDrop(log(all))).toEqual([]);
  });
  it('drops denied and given entries first, oldest first', () => {
    const all = [mk(0, 'approved'), mk(1, 'approved', { givenAt: 5 }), mk(2, 'denied'), mk(3, 'approved', { givenAt: 6 }),
      ...Array.from({ length: 96 }, (_, i) => mk(i + 4, 'pending'))];
    expect(D.idsToDrop(log(all))).toEqual(['x1']);
    expect(D.idsToDrop(log([...all, mk(200, 'pending')]))).toEqual(['x1', 'x2']);
  });
});

describe('requestReward at the cap (AC3, AC4)', () => {
  it('refuses with a clear toast, no spend and no write when nothing can be dropped', async () => {
    state.redemptions = log(Array.from({ length: 100 }, (_, i) => mk(i, i % 2 ? 'pending' : 'approved')));
    await D.requestReward('r1', () => 'Alice');
    expect(spendPoints).not.toHaveBeenCalled();
    expect(patchRoot).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/unfinished/i));
    expect(Object.keys(state.redemptions)).toHaveLength(100);
  });
  it('keeps the cap at 100 and never nulls an undelivered entry', async () => {
    state.redemptions = log(Array.from({ length: 100 }, (_, i) => mk(i, i === 0 ? 'approved' : i === 1 ? 'denied' : 'pending')));
    await D.requestReward('r1', () => 'Alice');
    const fields = patchRoot.mock.calls[0][0];
    expect(fields['redemptions/x0']).toBeUndefined();
    expect(fields['redemptions/x1']).toBeNull();
    expect(Object.keys(state.redemptions)).toHaveLength(100);
    expect(D.MAX_REDEMPTIONS).toBe(100);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state, applySnapshot } from '../src/state.js';

let spendOk = true;
vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  spendPoints: vi.fn(async () => spendOk),
  refundPoints: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot, spendPoints, refundPoints } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { pushUndo } from '../src/undo.js';
import * as D from '../src/redemptions.js';
import * as R from '../src/rewards.js';

const asAlice = () => 'Alice';
const reward = { id: 'r1', name: 'Movie night', cost: 20, icon: '🎬' };

beforeEach(() => {
  vi.clearAllMocks();
  spendOk = true;
  state.members = { Alice: { name: 'Alice', role: 'member', points: 50 }, Bob: { name: 'Bob', role: 'member', points: 0 } };
  state.rewards = { r1: reward };
  state.redemptions = {};
});

describe('requestReward', () => {
  it('atomically spends then writes a pending entry for the requester', async () => {
    await D.requestReward('r1', asAlice);
    expect(spendPoints).toHaveBeenCalledWith('Alice', 20);
    expect(patchRoot).toHaveBeenCalledTimes(1);
    const fields = patchRoot.mock.calls[0][0];
    const [path, entry] = Object.entries(fields)[0];
    expect(path).toBe('redemptions/' + entry.id);
    expect(entry).toMatchObject({ rewardId: 'r1', rewardName: 'Movie night', cost: 20, member: 'Alice', status: 'pending' });
    expect(typeof entry.requestedAt).toBe('number');
    expect(spendPoints.mock.invocationCallOrder[0]).toBeLessThan(patchRoot.mock.invocationCallOrder[0]);
    expect(pushUndo).toHaveBeenCalledTimes(1);
  });
  it('refuses when the member has too few points (no spend, no write)', async () => {
    await D.requestReward('r1', () => 'Bob');
    expect(spendPoints).not.toHaveBeenCalled();
    expect(patchRoot).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Not enough points');
  });
  it('writes nothing if the atomic spend aborts (balance changed elsewhere)', async () => {
    spendOk = false;
    await D.requestReward('r1', asAlice);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(pushUndo).not.toHaveBeenCalled();
  });
  it('refunds if the entry write fails', async () => {
    patchRoot.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'NET' }));
    await D.requestReward('r1', asAlice);
    expect(refundPoints).toHaveBeenCalledWith('Alice', 20);
    expect(pushUndo).not.toHaveBeenCalled();
    expect(Object.keys(state.redemptions)).toHaveLength(0);
  });
  it('ignores unknown rewards and unknown/no members', async () => {
    await D.requestReward('nope', asAlice);
    await D.requestReward('r1', () => '');
    await D.requestReward('r1', () => 'Ghost');
    expect(spendPoints).not.toHaveBeenCalled();
  });
  it('a double click cannot spend twice', async () => {
    await Promise.all([D.requestReward('r1', asAlice), D.requestReward('r1', asAlice)]);
    expect(spendPoints).toHaveBeenCalledTimes(1);
  });
  it('undo deletes the entry and refunds while pending', async () => {
    await D.requestReward('r1', asAlice);
    const { undo } = pushUndo.mock.calls[0][0];
    const id = Object.keys(state.redemptions)[0];
    patchRoot.mockClear();
    await undo();
    expect(patchRoot).toHaveBeenCalledWith({ ['redemptions/' + id]: null });
    expect(refundPoints).toHaveBeenCalledWith('Alice', 20);
    expect(state.redemptions[id]).toBeUndefined();
  });
  it('undo refuses once an admin has processed the request', async () => {
    await D.requestReward('r1', asAlice);
    const id = Object.keys(state.redemptions)[0];
    state.redemptions[id].status = 'approved';
    patchRoot.mockClear();
    await expect(pushUndo.mock.calls[0][0].undo()).rejects.toThrow();
    expect(refundPoints).not.toHaveBeenCalled();
    expect(patchRoot).not.toHaveBeenCalled();
  });
});

describe('100-entry cap', () => {
  const mk = (n, status) => ({ id: 'x' + n, member: 'Bob', rewardName: 'r', cost: 1, requestedAt: n, status });
  it('drops the oldest non-pending entries in the same write', async () => {
    state.redemptions = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`x${i}`, mk(i, i < 2 ? 'approved' : 'pending')]));
    await D.requestReward('r1', asAlice);
    const fields = patchRoot.mock.calls[0][0];
    expect(fields['redemptions/x0']).toBeNull();
    expect(fields['redemptions/x1']).toBeUndefined();
    expect(Object.keys(state.redemptions)).toHaveLength(100);
  });
  it('refuses (without spending) when all 100 are pending', async () => {
    state.redemptions = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`x${i}`, mk(i, 'pending')]));
    await D.requestReward('r1', asAlice);
    expect(spendPoints).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Too many pending requests');
  });
  it('idsToDrop is empty under the cap', () => {
    expect(D.idsToDrop({ a: mk(1, 'approved') })).toEqual([]);
  });
});

describe('UI', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rewards-modal" class="hidden"><div id="rewards-list"></div><div id="rewards-pending"></div><form id="rewards-admin" class="hidden"></form></div>';
  });
  it('shows Request, disabled when points are too low', () => {
    expect(R.rewardsHTML({ r1: reward }, false, { me: 'Alice', points: 50 })).not.toMatch(/disabled/);
    expect(R.rewardsHTML({ r1: reward }, false, { me: 'Bob', points: 5 })).toMatch(/disabled/);
  });
  it('shows no Request button without a member (TV / logged out)', () => {
    expect(R.rewardsHTML({ r1: reward }, false)).not.toContain('Request');
  });
  it('lists the member\'s own pending requests and escapes names', () => {
    state.redemptions = {
      a: { id: 'a', member: 'Alice', rewardName: '<b>x</b>', cost: 3, requestedAt: 1, status: 'pending' },
      b: { id: 'b', member: 'Bob', rewardName: 'Bobs thing', cost: 3, requestedAt: 2, status: 'pending' },
    };
    R.openRewards(() => false, asAlice);
    const html = document.getElementById('rewards-pending').innerHTML;
    expect(html).toContain('&lt;b&gt;x');
    expect(html).not.toContain('<b>x');
    expect(html).not.toContain('Bobs thing');
    expect(html).toContain('Your points: 50');
  });
  it('admin sees the pending count', () => {
    state.redemptions = { a: { id: 'a', member: 'Bob', rewardName: 'n', cost: 3, requestedAt: 1, status: 'pending' } };
    R.openRewards(() => true, asAlice);
    expect(document.getElementById('rewards-pending').textContent).toContain('1 request awaiting approval');
  });
});

describe('state wiring', () => {
  it('applySnapshot keeps redemptions and defaults to {}', () => {
    applySnapshot({ redemptions: { a: { id: 'a' } } });
    expect(state.redemptions).toEqual({ a: { id: 'a' } });
    applySnapshot({});
    expect(state.redemptions).toEqual({});
  });
});

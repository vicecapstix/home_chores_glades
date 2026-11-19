import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

let takeOk = true, refundFails = false;
vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), get READONLY() { return globalThis.__RO === true; } }));
vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  patchPaths: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined),
  spendPoints: vi.fn().mockResolvedValue(true),
  refundPoints: vi.fn(async () => { if (refundFails) throw new Error('boom'); }),
  decideRedemption: vi.fn().mockResolvedValue(true),
  takePendingRedemption: vi.fn(async () => takeOk),
  reserveStock: vi.fn().mockResolvedValue(true),
  releaseStock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchPaths, refundPoints, releaseStock, takePendingRedemption } from '../src/firebase.js';
import { pushUndo } from '../src/undo.js';
import * as D from '../src/redemptions.js';
import { removeMember } from '../src/members.js';

const asAlice = () => 'Alice';
beforeEach(() => {
  vi.clearAllMocks(); takeOk = true; refundFails = false; globalThis.__RO = false;
  vi.stubGlobal('confirm', () => true);
  state.members = { Alice: { name: 'Alice', role: 'member', points: 100 }, Bob: { name: 'Bob', role: 'admin', points: 0 } };
  state.tasks = {};
  state.rewards = { r1: { id: 'r1', name: 'Cinema', cost: 20, icon: '🎬', stock: 2 } };
  state.redemptions = {};
});

describe('removing a member returns reserved stock (#357 blocker 1)', () => {
  it('releases one copy per pending request of the removed member only', async () => {
    state.redemptions = {
      a: { id: 'a', rewardId: 'r1', member: 'Alice', status: 'pending' },
      b: { id: 'b', rewardId: 'r1', member: 'Alice', status: 'approved' },
      c: { id: 'c', rewardId: 'r1', member: 'Bob', status: 'pending' },
    };
    await removeMember('Alice', () => true);
    expect(patchPaths).toHaveBeenCalled();
    expect(releaseStock).toHaveBeenCalledTimes(1);
    expect(releaseStock).toHaveBeenCalledWith('r1');
  });
  it('releases nothing when the removal write fails', async () => {
    state.redemptions = { a: { id: 'a', rewardId: 'r1', member: 'Alice', status: 'pending' } };
    patchPaths.mockRejectedValueOnce(new Error('x'));
    await removeMember('Alice', () => true);
    expect(releaseStock).not.toHaveBeenCalled();
  });
  it('non-admin cannot remove (no release)', async () => {
    state.redemptions = { a: { id: 'a', rewardId: 'r1', member: 'Alice', status: 'pending' } };
    await removeMember('Alice', () => false);
    expect(releaseStock).not.toHaveBeenCalled();
  });
  it('READONLY: nothing happens', async () => {
    globalThis.__RO = true;
    state.redemptions = { a: { id: 'a', rewardId: 'r1', member: 'Alice', status: 'pending' } };
    await removeMember('Alice', () => true);
    expect(patchPaths).not.toHaveBeenCalled();
    expect(releaseStock).not.toHaveBeenCalled();
  });
});

describe('undo of a request (#357 blockers 2 and 3)', () => {
  async function request() {
    await D.requestReward('r1', asAlice);
    return { undo: pushUndo.mock.calls[0][0].undo, id: Object.keys(state.redemptions)[0] };
  }
  it('gives the copy back before refunding, even when the refund throws', async () => {
    const { undo } = await request();
    releaseStock.mockClear();
    refundFails = true;
    await expect(undo()).rejects.toThrow('boom');
    expect(releaseStock).toHaveBeenCalledWith('r1');
  });
  it('removes through the transaction guard and returns exactly one copy', async () => {
    const { undo, id } = await request();
    releaseStock.mockClear();
    await undo();
    expect(takePendingRedemption).toHaveBeenCalledWith(id);
    expect(releaseStock).toHaveBeenCalledTimes(1);
    expect(refundPoints).toHaveBeenCalledWith('Alice', 20);
  });
  it('when the live entry is no longer pending (denied elsewhere) it returns nothing', async () => {
    const { undo } = await request();
    releaseStock.mockClear(); refundPoints.mockClear();
    takeOk = false;
    await expect(undo()).rejects.toThrow('Already processed');
    expect(releaseStock).not.toHaveBeenCalled();
    expect(refundPoints).not.toHaveBeenCalled();
  });
});

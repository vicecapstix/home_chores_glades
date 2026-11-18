import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

let stockOk = true, decideOk = true;
vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), get READONLY() { return globalThis.__RO === true; } }));
vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  spendPoints: vi.fn().mockResolvedValue(true),
  refundPoints: vi.fn().mockResolvedValue(undefined),
  decideRedemption: vi.fn(async () => decideOk),
  reserveStock: vi.fn(async () => stockOk),
  releaseStock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot, spendPoints, reserveStock, releaseStock } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import * as D from '../src/redemptions.js';
import * as R from '../src/rewards.js';

const admin = () => true, notAdmin = () => false, asAlice = () => 'Alice';
const setForm = (o) => {
  document.body.innerHTML = '<input id="reward-name"><input id="reward-cost"><input id="reward-icon"><input id="reward-perweek"><input id="reward-stock"><button id="reward-save"></button><button id="reward-cancel"></button>';
  const v = { 'reward-name': 'Cinema', 'reward-cost': '20', 'reward-icon': '', 'reward-perweek': '', 'reward-stock': '', ...o };
  for (const k in v) document.getElementById(k).value = v[k];
};

beforeEach(() => {
  vi.clearAllMocks(); stockOk = true; decideOk = true; globalThis.__RO = false;
  state.members = { Alice: { name: 'Alice', role: 'member', points: 100 } };
  state.rewards = { r1: { id: 'r1', name: 'Cinema', cost: 20, icon: '🎬', stock: 1 } };
  state.redemptions = {};
});

describe('validation', () => {
  it('stock optional, 1-99 integers', () => {
    expect(R.validateReward('x', 5, '', '', '').reward).not.toHaveProperty('stock');
    expect(R.validateReward('x', 5, '', '', '3').reward.stock).toBe(3);
    expect(R.validateReward('x', 5, '', '', 99).reward.stock).toBe(99);
    for (const v of ['0', 100, '1.5', 'abc', -1]) expect(R.validateReward('x', 5, '', '', v).error).toMatch(/1–99/);
  });
});

describe('card', () => {
  it('shows N left and enabled Request', () => {
    const h = R.rewardsHTML(state.rewards, false, { me: 'Alice', points: 100 });
    expect(h).toContain('1 left');
    expect(h).not.toMatch(/disabled/);
  });
  it('sold out at 0 disables Request', () => {
    state.rewards.r1.stock = 0;
    const h = R.rewardsHTML(state.rewards, false, { me: 'Alice', points: 100 });
    expect(h).toContain('Sold out');
    expect(h).toMatch(/disabled/);
  });
  it('TV/read-only list shows N left with no buttons; unlimited shows nothing', () => {
    expect(R.rewardsHTML(state.rewards, false)).toContain('1 left');
    expect(R.rewardsHTML(state.rewards, false)).not.toContain('<button');
    delete state.rewards.r1.stock;
    expect(R.rewardsHTML(state.rewards, false)).not.toMatch(/left|Sold out/);
  });
});

describe('request', () => {
  it('refused locally at 0 without touching stock or points', async () => {
    state.rewards.r1.stock = 0;
    await D.requestReward('r1', asAlice);
    expect(showToast).toHaveBeenCalledWith('Sold out');
    expect(reserveStock).not.toHaveBeenCalled(); expect(spendPoints).not.toHaveBeenCalled();
  });
  it('lost race on the last one: no points spent', async () => {
    stockOk = false;
    await D.requestReward('r1', asAlice);
    expect(spendPoints).not.toHaveBeenCalled(); expect(patchRoot).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Sold out');
  });
  it('reserves stock on success', async () => {
    await D.requestReward('r1', asAlice);
    expect(reserveStock).toHaveBeenCalledWith('r1');
    expect(releaseStock).not.toHaveBeenCalled();
    expect(Object.values(state.redemptions)).toHaveLength(1);
  });
  it('returns the reservation when points spend fails', async () => {
    spendPoints.mockResolvedValueOnce(false);
    await D.requestReward('r1', asAlice);
    expect(releaseStock).toHaveBeenCalledWith('r1');
  });
  it('returns the reservation when the request write fails', async () => {
    patchRoot.mockRejectedValueOnce(new Error('x'));
    await D.requestReward('r1', asAlice);
    expect(releaseStock).toHaveBeenCalledWith('r1');
  });
  it('READONLY does nothing', async () => {
    globalThis.__RO = true;
    await D.requestReward('r1', asAlice);
    expect(reserveStock).not.toHaveBeenCalled();
  });
});

describe('decide', () => {
  const pend = () => { state.redemptions = { rd1: { id: 'rd1', rewardId: 'r1', rewardName: 'Cinema', cost: 20, member: 'Alice', requestedAt: 1, status: 'pending' } }; };
  it('approve keeps the reservation', async () => {
    pend(); await D.decideRequest('rd1', 'approved', admin, asAlice);
    expect(releaseStock).not.toHaveBeenCalled();
  });
  it('deny returns one to stock', async () => {
    pend(); await D.decideRequest('rd1', 'denied', admin, asAlice);
    expect(releaseStock).toHaveBeenCalledWith('r1');
  });
  it('lost decide race does not release', async () => {
    pend(); decideOk = false; await D.decideRequest('rd1', 'denied', admin, asAlice);
    expect(releaseStock).not.toHaveBeenCalled();
  });
  it('non-admin cannot decide', async () => {
    pend(); await D.decideRequest('rd1', 'denied', notAdmin, asAlice);
    expect(releaseStock).not.toHaveBeenCalled();
  });
});

describe('admin edit', () => {
  it('saves stock in the reward', async () => {
    setForm({ 'reward-stock': '3' });
    await R.saveReward(admin);
    expect(Object.values(patchRoot.mock.calls[0][0])[0].stock).toBe(3);
  });
  it('blank stock = unlimited (field omitted)', async () => {
    setForm({});
    await R.saveReward(admin);
    expect(Object.values(patchRoot.mock.calls[0][0])[0]).not.toHaveProperty('stock');
  });
  it('invalid stock is rejected', async () => {
    setForm({ 'reward-stock': '100' });
    await R.saveReward(admin);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('member cannot save or edit', async () => {
    setForm({ 'reward-stock': '3' });
    await R.saveReward(notAdmin); R.editReward('r1', notAdmin);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(document.getElementById('reward-stock').value).toBe('3');
  });
  it('READONLY cannot save', async () => {
    globalThis.__RO = true; setForm({ 'reward-stock': '3' });
    await R.saveReward(admin);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('editing prefills stock', () => {
    setForm({}); R.editReward('r1', admin);
    expect(document.getElementById('reward-stock').value).toBe('1');
  });
});

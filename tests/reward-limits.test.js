import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  spendPoints: vi.fn().mockResolvedValue(true),
  refundPoints: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot, spendPoints } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import * as D from '../src/redemptions.js';
import * as R from '../src/rewards.js';

const NOW = new Date(2026, 9, 14, 12, 0).getTime(); // Wed 14 Oct 2026
const MON = new Date(2026, 9, 12, 0, 0).getTime();
const admin = () => true, notAdmin = () => false;
const asAlice = () => 'Alice';
const rd = (id, status, requestedAt, o = {}) => ({ id, rewardId: 'r1', member: 'Alice', status, requestedAt, cost: 20, ...o });
const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.members = { Alice: { name: 'Alice', role: 'member', points: 100 }, Bob: { name: 'Bob', role: 'member', points: 100 } };
  state.rewards = { r1: { id: 'r1', name: 'Screen time', cost: 20, icon: '📺', perWeek: 2 } };
  state.redemptions = {};
});
afterEach(() => vi.useRealTimers());

describe('validation', () => {
  it('perWeek is optional; 1-14 integers accepted', () => {
    expect(R.validateReward('x', 5, '', '').reward.perWeek).toBeUndefined();
    expect(R.validateReward('x', 5, '', undefined).reward).not.toHaveProperty('perWeek');
    expect(R.validateReward('x', 5, '', '1').reward.perWeek).toBe(1);
    expect(R.validateReward('x', 5, '', 14).reward.perWeek).toBe(14);
  });
  it('rejects 0, 15, decimals and text', () => {
    for (const v of ['0', 15, '1.5', 'abc', -1]) expect(R.validateReward('x', 5, '', v).error).toMatch(/1–14/);
  });
});

describe('usedThisWeek', () => {
  it('counts pending and approved for that member and reward only', () => {
    state.redemptions = {
      a: rd('a', 'pending', NOW), b: rd('b', 'approved', NOW - 3600000),
      c: rd('c', 'pending', NOW, { member: 'Bob' }), d: rd('d', 'pending', NOW, { rewardId: 'r2' }),
    };
    expect(D.usedThisWeek(state.redemptions, 'r1', 'Alice', NOW)).toBe(2);
  });
  it('denied requests do not count', () => {
    state.redemptions = { a: rd('a', 'denied', NOW), b: rd('b', 'pending', NOW) };
    expect(D.usedThisWeek(state.redemptions, 'r1', 'Alice', NOW)).toBe(1);
  });
  it('a new week resets: Monday 00:00 in, Sunday 23:59 of last week out', () => {
    state.redemptions = { a: rd('a', 'approved', MON - 1), b: rd('b', 'approved', MON) };
    expect(D.usedThisWeek(state.redemptions, 'r1', 'Alice', NOW)).toBe(1);
    const nextMon = new Date(2026, 9, 19, 0, 0).getTime();
    expect(D.usedThisWeek(state.redemptions, 'r1', 'Alice', nextMon)).toBe(0);
  });
});

describe('requestReward enforcement', () => {
  it('blocks at the limit without spending points', async () => {
    state.redemptions = { a: rd('a', 'pending', NOW), b: rd('b', 'approved', NOW) };
    await D.requestReward('r1', asAlice);
    expect(spendPoints).not.toHaveBeenCalled();
    expect(patchRoot).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Limit reached: 2 per week');
  });
  it('allows below the limit and when the earlier ones were denied', async () => {
    state.redemptions = { a: rd('a', 'pending', NOW), b: rd('b', 'denied', NOW) };
    await D.requestReward('r1', asAlice);
    expect(spendPoints).toHaveBeenCalledTimes(1);
  });
  it('allows again in a new week', async () => {
    state.redemptions = { a: rd('a', 'approved', MON - 1000), b: rd('b', 'approved', MON - 2000) };
    await D.requestReward('r1', asAlice);
    expect(spendPoints).toHaveBeenCalledTimes(1);
  });
  it('limit is per member', async () => {
    state.redemptions = { a: rd('a', 'pending', NOW, { member: 'Bob' }), b: rd('b', 'pending', NOW, { member: 'Bob' }) };
    await D.requestReward('r1', asAlice);
    expect(spendPoints).toHaveBeenCalledTimes(1);
  });
  it('rewards without perWeek are unlimited', async () => {
    state.rewards.r1 = { id: 'r1', name: 'Screen time', cost: 20 };
    state.redemptions = Object.fromEntries(Array.from({ length: 5 }, (_, i) => ['x' + i, rd('x' + i, 'pending', NOW)]));
    await D.requestReward('r1', asAlice);
    expect(spendPoints).toHaveBeenCalledTimes(1);
  });
});

describe('button text', () => {
  it('shows used/limit and disables the button at the limit', () => {
    state.redemptions = { a: rd('a', 'pending', NOW), b: rd('b', 'approved', NOW) };
    const out = R.rewardsHTML(state.rewards, false, { me: 'Alice', points: 100 });
    expect(out).toContain('2/2 this week');
    expect(out).toMatch(/<button[^>]*aria-label="Request Screen time" disabled/);
  });
  it('shows progress but stays enabled below the limit', () => {
    state.redemptions = { a: rd('a', 'pending', NOW) };
    const out = R.rewardsHTML(state.rewards, false, { me: 'Alice', points: 100 });
    expect(out).toContain('1/2 this week');
    expect(out).not.toMatch(/aria-label="Request Screen time" disabled/);
    expect(out).toContain('>Request</button>');
  });
  it('TV/no-member view shows the plain limit; unlimited rewards show nothing', () => {
    expect(R.rewardsHTML(state.rewards, false, {})).toContain('2 per week');
    state.rewards.r1 = { id: 'r1', name: 'Plain', cost: 5 };
    expect(R.rewardsHTML(state.rewards, false, { me: 'Alice', points: 9 })).not.toContain('this week');
  });
});

describe('admin form', () => {
  function mount() {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.body.innerHTML = doc.getElementById('rewards-modal').outerHTML;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  }
  const fill = (name, cost, per) => {
    document.getElementById('reward-name').value = name;
    document.getElementById('reward-cost').value = cost;
    document.getElementById('reward-perweek').value = per;
  };
  beforeEach(() => { state.rewards = {}; mount(); });

  it('saves perWeek on a new reward', async () => {
    fill('Movie', '30', '3');
    await R.saveReward(admin);
    const written = Object.values(patchRoot.mock.calls[0][0])[0];
    expect(written.perWeek).toBe(3);
  });
  it('saves without perWeek when blank', async () => {
    fill('Movie', '30', '');
    await R.saveReward(admin);
    expect(Object.values(patchRoot.mock.calls[0][0])[0]).not.toHaveProperty('perWeek');
  });
  it('invalid perWeek blocks the write', async () => {
    fill('Movie', '30', '20');
    await R.saveReward(admin);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/1–14/));
  });
  it('edit loads perWeek and clearing it removes the limit', async () => {
    state.rewards = { r1: { id: 'r1', name: 'Screen', cost: 20, icon: '📺', perWeek: 2 } };
    R.editReward('r1', admin);
    expect(document.getElementById('reward-perweek').value).toBe('2');
    document.getElementById('reward-perweek').value = '';
    await R.saveReward(admin);
    expect(patchRoot.mock.calls[0][0]['rewards/r1']).not.toHaveProperty('perWeek');
  });
  it('non-admin cannot save', async () => {
    fill('Movie', '30', '3');
    await R.saveReward(notAdmin);
    expect(patchRoot).not.toHaveBeenCalled();
  });
});

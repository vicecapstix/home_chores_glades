import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ patchMember: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { patchMember } from '../src/firebase.js';
import { setGoal } from '../src/savings.js';
import { goalProgress, goalHTML } from '../src/utils.js';
import { tvStripHTML } from '../src/tv.js';

const me = () => 'Kid';
const admin = () => true;
const notAdmin = () => false;

beforeEach(() => {
  vi.clearAllMocks();
  state.rewards = { r1: { id: 'r1', name: 'Movie', cost: 50 }, r2: { id: 'r2', name: 'Toy', cost: 20 } };
  state.members = {
    Kid: { name: 'Kid', role: 'member', points: 34 },
    Sib: { name: 'Sib', role: 'member', points: 5 },
  };
});

describe('setGoal', () => {
  it('sets, replaces and clears with a single-leaf patch', async () => {
    expect(await setGoal('Kid', 'r1', me, notAdmin)).toBe(true);
    expect(patchMember).toHaveBeenLastCalledWith('Kid', { goalRewardId: 'r1' });
    expect(state.members.Kid.goalRewardId).toBe('r1');
    await setGoal('Kid', 'r2', me, notAdmin);
    expect(patchMember).toHaveBeenLastCalledWith('Kid', { goalRewardId: 'r2' });
    await setGoal('Kid', '', me, notAdmin);
    expect(patchMember).toHaveBeenLastCalledWith('Kid', { goalRewardId: null });
    expect(state.members.Kid.goalRewardId).toBeUndefined();
  });
  it('members cannot set someone else’s goal; admins can', async () => {
    expect(await setGoal('Sib', 'r1', me, notAdmin)).toBe(false);
    expect(patchMember).not.toHaveBeenCalled();
    expect(await setGoal('Sib', 'r1', me, admin)).toBe(true);
    expect(patchMember).toHaveBeenCalledWith('Sib', { goalRewardId: 'r1' });
  });
  it('ignores unknown reward or member', async () => {
    expect(await setGoal('Kid', 'nope', me, admin)).toBe(false);
    expect(await setGoal('Ghost', 'r1', me, admin)).toBe(false);
    expect(patchMember).not.toHaveBeenCalled();
  });
});

describe('goalProgress / goalHTML', () => {
  it('computes progress and ready state', () => {
    const g = goalProgress({ points: 34, goalRewardId: 'r1' }, state.rewards);
    expect(g).toMatchObject({ points: 34, cost: 50, pct: 68, ready: false });
    expect(goalProgress({ points: 80, goalRewardId: 'r1' }, state.rewards)).toMatchObject({ pct: 100, ready: true });
  });
  it('disappears when the reward is deleted and follows cost changes', () => {
    const m = { points: 34, goalRewardId: 'r1' };
    expect(goalHTML(m, { r2: state.rewards.r2 })).toBe('');
    expect(goalHTML({ points: 5 }, state.rewards)).toBe('');
    state.rewards.r1.cost = 40;
    expect(goalHTML(m, state.rewards)).toContain('34/40');
  });
  it('renders accessible progress bar and Ready text', () => {
    const html = goalHTML({ points: 34, goalRewardId: 'r1' }, state.rewards);
    expect(html).toContain('🎯 Movie 34/50');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="34"');
    expect(html).toContain('aria-valuemax="50"');
    expect(goalHTML({ points: 60, goalRewardId: 'r1' }, state.rewards)).toContain('Ready to request!');
  });
  it('escapes reward names', () => {
    const html = goalHTML({ points: 1, goalRewardId: 'x' }, { x: { name: '<img onerror=1>', cost: 5 } });
    expect(html).not.toContain('<img');
  });
  it('shows on the TV strip', () => {
    state.members.Kid.goalRewardId = 'r1';
    expect(tvStripHTML(state.members, [], state.rewards)).toContain('Movie 34/50');
  });
});

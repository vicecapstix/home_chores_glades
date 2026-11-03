import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ patchRoot: vi.fn().mockResolvedValue(undefined), patchMember: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import * as R from '../src/rewards.js';

const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
const btn = (label) => document.querySelector('button[aria-label="' + label + '"]');

beforeEach(() => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  document.body.innerHTML = doc.getElementById('rewards-modal').outerHTML;
  state.members = {
    Mum: { name: 'Mum', role: 'admin', points: 0 },
    Kid: { name: 'Kid', role: 'member', points: 60, goalRewardId: 'r1' },
  };
  state.rewards = { r1: { id: 'r1', name: 'Movie', cost: 50, icon: '🎬', perWeek: 2 } };
  state.redemptions = {};
  state.claims = {};
  R.openRewards(() => true, () => 'Mum');
});

describe('Rewards modal: Request is always for the logged-in member (#248)', () => {
  it('stays disabled for a 0-pt admin after picking a 60-pt member', () => {
    R.pickGoalTarget('Kid');
    expect(btn('Request Movie').disabled).toBe(true);
  });
  it('enables for an admin with enough points regardless of the pick', () => {
    state.members.Mum.points = 80;
    state.members.Kid.points = 0;
    R.pickGoalTarget('Kid');
    expect(btn('Request Movie').disabled).toBe(false);
  });
  it('weekly-limit state uses the logged-in member, not the pick', () => {
    state.members.Mum.points = 80;
    const now = Date.now();
    state.redemptions = { a: { id: 'a', rewardId: 'r1', member: 'Kid', status: 'pending', requestedAt: now }, b: { id: 'b', rewardId: 'r1', member: 'Kid', status: 'pending', requestedAt: now } };
    R.pickGoalTarget('Kid');
    expect(btn('Request Movie').disabled).toBe(false);
    expect(document.getElementById('rewards-list').textContent).not.toContain('2/2 this week');
  });
  it('goal buttons still follow the picked member', () => {
    R.pickGoalTarget('Kid');
    expect(btn('Clear goal Movie')).not.toBeNull();
  });
});

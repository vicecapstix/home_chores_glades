import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { removeMember } from '../src/members.js';

vi.mock('../src/firebase.js', () => ({
  patchPaths: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));

import { patchPaths } from '../src/firebase.js';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('confirm', vi.fn(() => true));
  state.members = { Al: { name: 'Al', role: 'admin' }, Bo: { name: 'Bo', role: 'member' }, Cy: { name: 'Cy', role: 'member' } };
  state.tasks = {
    t1: { id: 't1', name: 'Bins', freq: 'daily', person: 'Bo', needsCheck: true, checkPending: { by: 'Bo', at: 1 } },
    t2: { id: 't2', name: 'Dishes', freq: 'daily', person: '', needsCheck: true, checkPending: { by: 'Cy', at: 2 } },
  };
  state.redemptions = {}; state.claims = {};
});

describe('removeMember clears the removed member\'s pending parent check (#332)', () => {
  it('nulls checkPending on chores waiting on the removed member, in the same write', async () => {
    await removeMember('Bo', () => true, () => 'Al');
    const paths = patchPaths.mock.calls[0][0];
    expect(paths['tasks/t1/checkPending']).toBeNull();
    expect(paths['members/Bo']).toBeNull();
    expect(state.tasks.t1.checkPending).toBeUndefined();
  });
  it('leaves other members\' pending checks alone', async () => {
    await removeMember('Bo', () => true, () => 'Al');
    expect('tasks/t2/checkPending' in patchPaths.mock.calls[0][0]).toBe(false);
    expect(state.tasks.t2.checkPending).toEqual({ by: 'Cy', at: 2 });
  });
  it('does nothing for a non-admin', async () => {
    await removeMember('Bo', () => false, () => 'Al');
    expect(patchPaths).not.toHaveBeenCalled();
    expect(state.tasks.t1.checkPending).toEqual({ by: 'Bo', at: 1 });
  });
});

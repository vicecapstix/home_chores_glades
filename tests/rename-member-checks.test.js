import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { renameMember, renamePaths } from '../src/members.js';

vi.mock('../src/firebase.js', () => ({
  patchMember: vi.fn().mockResolvedValue(undefined),
  patchPaths: vi.fn().mockResolvedValue(undefined),
  renameHistoryPerson: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { patchPaths, renameHistoryPerson } from '../src/firebase.js';
import { showToast } from '../src/ui.js';

const admin = () => true;

beforeEach(() => {
  vi.clearAllMocks();
  state.members = {
    Ann: { name: 'Ann', role: 'admin' },
    Bo: { name: 'Bo', role: 'member' },
  };
  state.tasks = {
    t1: { id: 't1', person: 'Bo', checkPending: { by: 'Bo', at: 5 } },
    t2: { id: 't2', person: 'Ann', checkPending: { by: 'Ann', at: 6 } },
  };
  state.history = [{ person: 'Bo' }];
  state.redemptions = { r1: { member: 'Ann', givenBy: 'Bo' } };
  state.pause = { until: '2027-01-01', by: 'Bo', since: 1 };
  state.claims = {};
});

describe('rename keeps a waiting parent check payable (#274)', () => {
  it('moves checkPending.by for the renamed member only', () => {
    const p = renamePaths('Bo', 'Bobby');
    expect(p['tasks/t1/checkPending/by']).toBe('Bobby');
    expect(p['tasks/t2/checkPending/by']).toBeUndefined();
  });
  it('renames redemption givenBy and pause.by', () => {
    const p = renamePaths('Bo', 'Bobby');
    expect(p['redemptions/r1/givenBy']).toBe('Bobby');
    expect(p['pause/by']).toBe('Bobby');
  });
  it('does not write /admins or index-based history paths', () => {
    const p = renamePaths('Bo', 'Bobby');
    expect(Object.keys(p).some(k => k.startsWith('admins') || k.startsWith('history'))).toBe(false);
  });
});

describe('history rename goes through a name-matching transaction (#274)', () => {
  it('calls renameHistoryPerson after the multi-path update', async () => {
    expect(await renameMember('Bo', 'Bobby', admin)).toBe(true);
    expect(renameHistoryPerson).toHaveBeenCalledWith('Bo', 'Bobby');
    expect(patchPaths.mock.invocationCallOrder[0]).toBeLessThan(renameHistoryPerson.mock.invocationCallOrder[0]);
  });
  it('still succeeds but warns if the history rename fails', async () => {
    renameHistoryPerson.mockRejectedValueOnce(new Error('boom'));
    expect(await renameMember('Bo', 'Bobby', admin)).toBe(true);
    expect(showToast).toHaveBeenCalled();
  });
  it('does not touch history when the main rename fails or caller is not admin', async () => {
    patchPaths.mockRejectedValueOnce(new Error('x'));
    expect(await renameMember('Bo', 'Bobby', admin)).toBe(false);
    expect(await renameMember('Bo', 'Bobby', () => false)).toBe(false);
    expect(renameHistoryPerson).not.toHaveBeenCalled();
  });
});

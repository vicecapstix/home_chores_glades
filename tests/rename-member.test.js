import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { renameMember, renamePaths } from '../src/members.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined),
  patchPaths: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { patchPaths } from '../src/firebase.js';
import { showToast } from '../src/ui.js';

const admin = () => true, notAdmin = () => false;

beforeEach(() => {
  vi.clearAllMocks();
  state.members = {
    Ann: { name: 'Ann', role: 'admin', pinHash: 'abc123', points: 42, avatar: '🦊', badges: ['first'] },
    Bo: { name: 'Bo', role: 'member', pinHash: '' },
  };
  state.tasks = {
    t1: { id: 't1', person: 'Ann', lastDoneBy: 'Ann' },
    t2: { id: 't2', person: 'Bo' },
  };
  state.history = [{ person: 'Ann' }, { person: 'Bo' }, { person: 'Ann' }];
  state.redemptions = { r1: { member: 'Ann', decidedBy: 'Bo' } };
});

describe('renameMember', () => {
  it('moves the member key keeping every field (pinHash, points, avatar)', async () => {
    expect(await renameMember('Ann', ' Anna ', admin)).toBe(true);
    const p = patchPaths.mock.calls[0][0];
    expect(p['members/Ann']).toBeNull();
    expect(p['members/Anna']).toEqual({ ...state.members.Ann, name: 'Anna' });
    expect(p['members/Anna'].pinHash).toBe('abc123');
  });
  it('reassigns tasks, history and redemptions in ONE update', async () => {
    await renameMember('Ann', 'Anna', admin);
    expect(patchPaths).toHaveBeenCalledTimes(1);
    const p = patchPaths.mock.calls[0][0];
    expect(p['tasks/t1/person']).toBe('Anna');
    expect(p['tasks/t1/lastDoneBy']).toBe('Anna');
    expect(p['tasks/t2/person']).toBeUndefined();
    expect(p['history/0/person']).toBe('Anna');
    expect(p['history/2/person']).toBe('Anna');
    expect(p['history/1/person']).toBeUndefined();
    expect(p['redemptions/r1/member']).toBe('Anna');
    expect(p['redemptions/r1/decidedBy']).toBeUndefined();
  });
  it('rejects duplicates and invalid names', async () => {
    expect(await renameMember('Ann', 'Bo', admin)).toBe(false);
    expect(await renameMember('Ann', 'A.b', admin)).toBe(false);
    expect(await renameMember('Ann', 'x'.repeat(31), admin)).toBe(false);
    expect(await renameMember('Ann', '  ', admin)).toBe(false);
    expect(await renameMember('Ann', 'Ann', admin)).toBe(false);
    expect(await renameMember('Ghost', 'Zed', admin)).toBe(false);
    expect(patchPaths).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });
  it('is admin-only', async () => {
    expect(await renameMember('Ann', 'Anna', notAdmin)).toBe(false);
    expect(patchPaths).not.toHaveBeenCalled();
  });
  it('reports failure when the write throws', async () => {
    patchPaths.mockRejectedValueOnce(new Error('boom'));
    expect(await renameMember('Ann', 'Anna', admin)).toBe(false);
    expect(showToast).toHaveBeenCalled();
  });
  it('renamePaths does not mutate state', () => {
    renamePaths('Ann', 'Anna');
    expect(state.members.Ann.name).toBe('Ann');
    expect(state.members.Anna).toBeUndefined();
  });
});

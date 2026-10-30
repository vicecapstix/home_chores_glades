// #224 review fix: if the points were added but the history entry failed, the claim must
// not come back (a second Approve would pay twice). Firebase is mocked; no live database.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  takeClaim: vi.fn().mockResolvedValue(true),
  adjustMemberPoints: vi.fn().mockResolvedValue({ ok: true, reason: '' }),
  appendHistory: vi.fn().mockRejectedValue(new Error('history write failed')),
  removeHistoryEntry: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot, adjustMemberPoints } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { decideClaim } from '../src/claims.js';
import { adjustBonus } from '../src/bonus.js';

const admin = () => true, asDad = () => 'Dad';

beforeEach(() => {
  vi.clearAllMocks();
  state.members = { Amy: { name: 'Amy', role: 'member', points: 3 }, Dad: { name: 'Dad', role: 'admin', points: 0 } };
  state.claims = { c1: { id: 'c1', member: 'Amy', name: 'Carried shopping', points: 5, requestedAt: 1 } };
});

describe('approve when only the history write fails', () => {
  it('adjustBonus reports the points as given and tells the admin the log failed', async () => {
    expect(await adjustBonus('Amy', 5, 'Nice', admin, asDad)).toBe(true);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('history'));
  });
  it('does not put the claim back, so a second Approve cannot pay twice', async () => {
    expect(await decideClaim('c1', 'approved', 5, admin, asDad)).toBe(true);
    expect(adjustMemberPoints).toHaveBeenCalledTimes(1);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(state.claims.c1).toBeUndefined();
    expect(await decideClaim('c1', 'approved', 5, admin, asDad)).toBe(false);
    expect(adjustMemberPoints).toHaveBeenCalledTimes(1);
  });
  it('still puts the claim back when the points themselves did not move', async () => {
    adjustMemberPoints.mockResolvedValueOnce({ ok: false, reason: 'offline' });
    expect(await decideClaim('c1', 'approved', 5, admin, asDad)).toBe(false);
    expect(patchRoot).toHaveBeenCalledWith({ 'claims/c1': expect.objectContaining({ id: 'c1' }) });
    expect(state.claims.c1).toBeTruthy();
  });
});

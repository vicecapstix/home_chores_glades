import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { toggleRole, toggleRoleInPanel } from '../src/members.js';

vi.mock('../src/firebase.js', () => ({
  patchPaths:  vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));

import { patchMember } from '../src/firebase.js';
import { showToast } from '../src/ui.js';

let me;
const currentMember = () => me;
// Admin = the signed-in member currently has the admin role (mirrors auth.isAdmin without /admins).
const isAdmin = () => state.members[me]?.role === 'admin';
const reopen = vi.fn();
const close = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  me = 'Alice';
  state.members = { Alice: { name: 'Alice', role: 'admin' }, Bob: { name: 'Bob', role: 'admin' }, Cy: { name: 'Cy', role: 'member' } };
  // The real listener reflects the write into state; emulate that here.
  patchMember.mockImplementation(async (name, f) => { Object.assign(state.members[name], f); });
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('self-demotion (#168)', () => {
  it('cancelling the confirm writes nothing and keeps the panel open', async () => {
    confirm.mockReturnValue(false);
    await toggleRoleInPanel('Alice', isAdmin, currentMember, reopen, close);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('lose admin on this device'));
    expect(patchMember).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(reopen).toHaveBeenCalledTimes(1);
  });
  it('confirming writes the demotion, closes the panel and toasts', async () => {
    await toggleRoleInPanel('Alice', isAdmin, currentMember, reopen, close);
    expect(patchMember).toHaveBeenCalledWith('Alice', { role: 'member' });
    expect(close).toHaveBeenCalledTimes(1);
    expect(reopen).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('no longer an admin'));
  });
  it('demoting someone else needs no confirm and the panel re-renders after the write', async () => {
    let wrote = false;
    patchMember.mockImplementation(async (name, f) => { await Promise.resolve(); Object.assign(state.members[name], f); wrote = true; });
    let roleSeenOnReopen;
    const reopenSpy = vi.fn(() => { roleSeenOnReopen = state.members.Bob.role; });
    await toggleRoleInPanel('Bob', isAdmin, currentMember, reopenSpy, close);
    expect(confirm).not.toHaveBeenCalled();
    expect(wrote).toBe(true);
    expect(roleSeenOnReopen).toBe('member');
    expect(close).not.toHaveBeenCalled();
  });
  it('promoting a member shows the new role', async () => {
    await toggleRoleInPanel('Cy', isAdmin, currentMember, reopen, close);
    expect(state.members.Cy.role).toBe('admin');
    expect(reopen).toHaveBeenCalled();
  });
  it('last-admin protection is unchanged (no confirm, no write)', async () => {
    state.members.Bob.role = 'member';
    const ok = await toggleRole('Alice', isAdmin, currentMember);
    expect(ok).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
    expect(patchMember).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Cannot demote the last admin');
  });
});

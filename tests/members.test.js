import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { addMember, removeMember, toggleRole } from '../src/members.js';

vi.mock('../src/firebase.js', () => ({
  patchPaths:  vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/ui.js', () => ({
  showToast: vi.fn(),
}));

import { patchPaths, patchMember } from '../src/firebase.js';
import { showToast } from '../src/ui.js';

const isAdmin  = () => true;
const notAdmin = () => false;

beforeEach(() => {
  vi.clearAllMocks();
  state.members   = {};
  state.tasks     = {};
  state.history   = [];
  state.nextId    = 1;
  state.templates = {};

  // removeMember now asks for confirmation (#27)
  vi.stubGlobal('confirm', vi.fn(() => true));

  // addMember reads the value of #new-member
  document.body.innerHTML = '<input id="new-member" value="" />';
});

// ── addMember ─────────────────────────────────────────────────────────────────

describe('addMember', () => {
  it('creates a member with all required fields', async () => {
    document.getElementById('new-member').value = 'Alice';
    await addMember(isAdmin);
    expect(state.members).toHaveProperty('Alice');
    const m = state.members.Alice;
    expect(m.name).toBe('Alice');
    expect(m.points).toBe(0);
    expect(m.streak).toBe(0);
    expect(m.badges).toEqual([]);
    expect(m.completedCount).toBe(0);
    expect(m.pinHash).toBe('');
  });
  it('first member gets the "admin" role', async () => {
    document.getElementById('new-member').value = 'Alice';
    await addMember(isAdmin);
    expect(state.members.Alice.role).toBe('admin');
  });
  it('subsequent members get the "member" role', async () => {
    state.members.Alice = { name: 'Alice', role: 'admin' };
    document.getElementById('new-member').value = 'Bob';
    await addMember(isAdmin);
    expect(state.members.Bob.role).toBe('member');
  });
  it('calls patchPaths after adding', async () => {
    document.getElementById('new-member').value = 'Alice';
    await addMember(isAdmin);
    expect(patchPaths).toHaveBeenCalledOnce();
  });
  it('clears the input field after adding', async () => {
    const inp = document.getElementById('new-member');
    inp.value = 'Alice';
    await addMember(isAdmin);
    expect(inp.value).toBe('');
  });
  it('does nothing when name is empty', async () => {
    document.getElementById('new-member').value = '';
    await addMember(isAdmin);
    expect(state.members).toEqual({});
    expect(patchPaths).not.toHaveBeenCalled();
  });
  it('does nothing when name is whitespace only', async () => {
    document.getElementById('new-member').value = '   ';
    await addMember(isAdmin);
    expect(state.members).toEqual({});
    expect(patchPaths).not.toHaveBeenCalled();
  });
  it('ignores duplicate names (member already exists)', async () => {
    state.members.Alice = { name: 'Alice', role: 'admin' };
    document.getElementById('new-member').value = 'Alice';
    await addMember(isAdmin);
    expect(patchPaths).not.toHaveBeenCalled();
    expect(Object.keys(state.members)).toHaveLength(1);
  });
  it('non-admin cannot add a member', async () => {
    document.getElementById('new-member').value = 'Alice';
    await addMember(notAdmin);
    expect(state.members).toEqual({});
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

// ── removeMember ──────────────────────────────────────────────────────────────

describe('removeMember', () => {
  beforeEach(() => {
    state.members = {
      Alice: { name: 'Alice', role: 'admin' },
      Bob:   { name: 'Bob',   role: 'member' },
    };
  });

  it('removes the member from state', async () => {
    await removeMember('Bob', isAdmin);
    expect(state.members).not.toHaveProperty('Bob');
    expect(state.members).toHaveProperty('Alice');
  });
  it('calls patchPaths after removing', async () => {
    await removeMember('Bob', isAdmin);
    expect(patchPaths).toHaveBeenCalledOnce();
  });
  it('clears the person field from tasks assigned to that member', async () => {
    state.tasks = {
      t1: { id: 't1', name: 'Dishes', person: 'Bob' },
      t2: { id: 't2', name: 'Sweep',  person: 'Alice' },
    };
    await removeMember('Bob', isAdmin);
    expect(state.tasks.t1.person).toBe('');
    expect(state.tasks.t2.person).toBe('Alice'); // unaffected
  });
  it('refuses to remove the last admin while others remain (#89)', async () => {
    await removeMember('Alice', isAdmin);
    expect(state.members).toHaveProperty('Alice');
    expect(patchPaths).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Cannot remove the last admin');
  });
  it('allows removing an admin when another admin exists (#89)', async () => {
    state.members.Bob.role = 'admin';
    await removeMember('Alice', isAdmin);
    expect(state.members).not.toHaveProperty('Alice');
  });
  it('allows removing the only member (#89)', async () => {
    delete state.members.Bob;
    await removeMember('Alice', isAdmin);
    expect(state.members).toEqual({});
  });
  it('drops pending redemptions of the removed member in the same write (#89)', async () => {
    state.redemptions = {
      r1: { id: 'r1', member: 'Bob', status: 'pending' },
      r2: { id: 'r2', member: 'Bob', status: 'approved' },
      r3: { id: 'r3', member: 'Alice', status: 'pending' },
    };
    patchPaths.mockImplementationOnce(async () => { expect(state.redemptions).not.toHaveProperty('r1'); });
    await removeMember('Bob', isAdmin);
    expect(patchPaths).toHaveBeenCalledOnce();
    expect(Object.keys(state.redemptions).sort()).toEqual(['r2', 'r3']);
  });
  it('calls onSelfRemoved after writing when removing the logged-in member (#89)', async () => {
    state.members.Bob.role = 'admin';
    const cb = vi.fn();
    patchPaths.mockImplementationOnce(async () => { expect(cb).not.toHaveBeenCalled(); });
    await removeMember('Alice', isAdmin, () => 'Alice', cb);
    expect(cb).toHaveBeenCalledOnce();
  });
  it('does not call onSelfRemoved for someone else or when the write fails (#89)', async () => {
    const cb = vi.fn();
    await removeMember('Bob', isAdmin, () => 'Alice', cb);
    expect(cb).not.toHaveBeenCalled();
    state.members.Bob = { name: 'Bob', role: 'admin' };
    patchPaths.mockRejectedValueOnce(new Error('x'));
    await removeMember('Alice', isAdmin, () => 'Alice', cb);
    expect(cb).not.toHaveBeenCalled();
  });
  it('non-admin cannot remove a member', async () => {
    await removeMember('Bob', notAdmin);
    expect(state.members).toHaveProperty('Bob');
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

// ── toggleRole ────────────────────────────────────────────────────────────────

describe('toggleRole', () => {
  beforeEach(() => {
    state.members = {
      Alice: { name: 'Alice', role: 'admin' },
      Bob:   { name: 'Bob',   role: 'member' },
    };
  });

  it('promotes a member to admin', async () => {
    await toggleRole('Bob', isAdmin);
    expect(patchMember).toHaveBeenCalledWith('Bob', { role: 'admin' });
  });
  it('demotes an admin to member (when another admin exists)', async () => {
    state.members.Bob.role = 'admin';
    await toggleRole('Alice', isAdmin);
    expect(patchMember).toHaveBeenCalledWith('Alice', { role: 'member' });
  });
  it('non-admin cannot toggle roles', async () => {
    await toggleRole('Bob', notAdmin);
    expect(patchMember).not.toHaveBeenCalled();
  });
  it('is a no-op when member does not exist', async () => {
    await toggleRole('Ghost', isAdmin);
    expect(patchMember).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state, memberColor, nextColorIdx } from '../src/state.js';
import { PCOLS } from '../src/config.js';
import { addMember, backfillColors, renamePaths } from '../src/members.js';

vi.mock('../src/firebase.js', () => ({
  patchPaths: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));

import { patchPaths } from '../src/firebase.js';

const mem = (name, colorIdx) => ({ name, role: 'member', ...(colorIdx === undefined ? {} : { colorIdx }) });
const isAdmin = () => true;

beforeEach(() => {
  vi.clearAllMocks();
  state.members = {}; state.tasks = {}; state.history = []; state.redemptions = {};
  document.body.innerHTML = '<input id="new-member">';
});

describe('memberColor (#166)', () => {
  it('uses the stored colorIdx, not the position', () => {
    state.members = { Aaron: mem('Aaron', 3), Bob: mem('Bob', 0) };
    expect(memberColor('Bob')).toBe(PCOLS[0]);
    expect(memberColor('Aaron')).toBe(PCOLS[3]);
  });
  it('adding a member alphabetically first leaves existing colours unchanged', () => {
    state.members = { Bob: mem('Bob', 0), Cleo: mem('Cleo', 1) };
    const before = [memberColor('Bob'), memberColor('Cleo')];
    state.members = { Aaron: mem('Aaron', 2), Bob: mem('Bob', 0), Cleo: mem('Cleo', 1) };
    expect([memberColor('Bob'), memberColor('Cleo')]).toEqual(before);
  });
  it('rename keeps the colour (record is copied with colorIdx)', () => {
    state.members = { Bob: mem('Bob', 4) };
    const paths = renamePaths('Bob', 'Robert');
    expect(paths['members/Robert'].colorIdx).toBe(4);
  });
  it('falls back to position for legacy members and null for unknown names', () => {
    state.members = { Al: mem('Al'), Bo: mem('Bo') };
    expect(memberColor('Bo')).toBe(PCOLS[1]);
    expect(memberColor('Nobody')).toBeNull();
  });
  it('nextColorIdx picks the least-used colour', () => {
    state.members = { A: mem('A', 0), B: mem('B', 1) };
    expect(nextColorIdx()).toBe(2);
    state.members = Object.fromEntries(PCOLS.map((_, i) => ['M' + i, mem('M' + i, i)]));
    state.members.Z = mem('Z', 0);
    expect(nextColorIdx()).toBe(1);
  });
});

describe('addMember / backfillColors (#166)', () => {
  it('stores a colorIdx on a new member', async () => {
    state.members = { Bob: mem('Bob', 0) };
    document.getElementById('new-member').value = 'Aaron';
    await addMember(isAdmin);
    expect(patchPaths.mock.calls[0][0]['members/Aaron'].colorIdx).toBe(1);
  });
  it('backfills missing colorIdx in one multi-path update with current colours', async () => {
    vi.resetModules();
    const s = (await import('../src/state.js')).state;
    const m = await import('../src/members.js');
    const fb = await import('../src/firebase.js');
    s.members = { Al: mem('Al'), Bo: mem('Bo'), Cy: mem('Cy', 5) };
    await m.backfillColors(isAdmin);
    expect(fb.patchPaths).toHaveBeenCalledTimes(1);
    expect(fb.patchPaths.mock.calls[0][0]).toEqual({ 'members/Al/colorIdx': 0, 'members/Bo/colorIdx': 1 });
    await m.backfillColors(isAdmin);
    expect(fb.patchPaths).toHaveBeenCalledTimes(1);
  });
  it('does not backfill for non-admins', async () => {
    state.members = { Al: mem('Al') };
    await backfillColors(() => false);
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

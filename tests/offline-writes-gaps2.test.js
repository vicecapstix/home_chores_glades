// #216 (review round 2): set-PIN, skip, clear done one-offs, mark given and rename must
// not claim success while the cached copy is showing. Firebase is mocked; no live database.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', async () => {
  const gate = await import('../src/writegate.js');
  return {
    setWritesEnabled: gate.setLive,
    writeState: vi.fn(), patchMember: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
    patchPaths: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import * as fb from '../src/firebase.js';
import { pushUndo } from '../src/undo.js';
import { CONNECTING_MSG } from '../src/writegate.js';
import * as ui from '../src/ui.js';
import { skipTask, clearDoneOnes } from '../src/tasks.js';
import { markGiven } from '../src/redemptions.js';
import { renameMember } from '../src/members.js';

const toast = () => document.getElementById('toast').textContent;
const admin = () => true;
const wrote = () => [fb.patchMember, fb.patchTask, fb.patchPaths, fb.patchRoot].some(f => f.mock.calls.length);

beforeEach(() => {
  vi.clearAllMocks();
  fb.setWritesEnabled(false);
  state.members = { Ann: { name: 'Ann', role: 'admin' }, Bob: { name: 'Bob', role: 'member' } };
  state.tasks = {
    a: { id: 'a', name: 'Dishes', freq: 'daily', done: false, lastDone: 0, person: 'Ann' },
    o: { id: 'o', name: 'Fix lamp', freq: 'once', done: true, lastDone: 1, person: 'Ann' },
  };
  state.redemptions = { r1: { id: 'r1', rewardName: 'Ice cream', member: 'Bob', status: 'approved' } };
  document.body.innerHTML = '<div id="toast"></div><div id="setpin-modal" class="hidden"><span id="setpin-title"></span><div id="setpin-error"></div><div id="setpin-dots">' +
    '<span class="pin-dot"></span>'.repeat(4) + '</div></div>';
  vi.stubGlobal('confirm', () => true);
  sessionStorage.setItem('fc_member', 'Bob');
});
afterEach(() => { fb.setWritesEnabled(true); ui.closeSetPin(); vi.unstubAllGlobals(); sessionStorage.clear(); });

describe('more entry points while cached data is showing (#216)', () => {
  it('set-PIN keypad shows still connecting and stores nothing', async () => {
    ui.openSetPin('Bob');
    for (const d of '1234') await ui.setPinKey(d);
    expect(toast()).toBe(CONNECTING_MSG);
    expect(fb.patchMember).not.toHaveBeenCalled();
    expect(document.getElementById('setpin-dots').querySelector('.filled')).toBeNull();
  });
  it('skipTask does not toast success, mutate or register an undo', async () => {
    await skipTask('a', admin);
    expect(toast()).toBe(CONNECTING_MSG);
    expect(state.tasks.a.skippedAt).toBeUndefined(); expect(pushUndo).not.toHaveBeenCalled(); expect(wrote()).toBe(false);
  });
  it('clearDoneOnes does not claim it cleared anything', async () => {
    await clearDoneOnes(admin);
    expect(toast()).toBe(CONNECTING_MSG);
    expect(pushUndo).not.toHaveBeenCalled(); expect(wrote()).toBe(false);
  });
  it('markGiven does not mark the reward as given', async () => {
    await markGiven('r1', admin, () => 'Ann');
    expect(toast()).toBe(CONNECTING_MSG);
    expect(state.redemptions.r1.givenAt).toBeUndefined(); expect(pushUndo).not.toHaveBeenCalled(); expect(wrote()).toBe(false);
  });
  it('renameMember keeps this device signed in as the old name', async () => {
    expect(await renameMember('Bob', 'Robert', admin)).toBe(false);
    expect(toast()).toBe(CONNECTING_MSG);
    expect(sessionStorage.getItem('fc_member')).toBe('Bob'); expect(wrote()).toBe(false);
  });
  it('all five work again once the live copy arrives', async () => {
    fb.setWritesEnabled(true);
    await skipTask('a', admin); await clearDoneOnes(admin); await markGiven('r1', admin, () => 'Ann');
    expect(await renameMember('Bob', 'Robert', admin)).toBe(true);
    expect(fb.patchTask).toHaveBeenCalled(); expect(fb.patchRoot).toHaveBeenCalled(); expect(fb.patchPaths).toHaveBeenCalled();
    expect(sessionStorage.getItem('fc_member')).toBe('Robert');
  });
});

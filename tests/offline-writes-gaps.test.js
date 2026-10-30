// #216 follow-up: remaining admin entry points must not claim success (or mutate local state)
// while the cached copy is showing. Firebase is mocked; no live database.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', async () => {
  const gate = await import('../src/writegate.js');
  return {
    setWritesEnabled: gate.setLive,
    writeState: vi.fn(), patchTask: vi.fn().mockResolvedValue(undefined), patchMember: vi.fn().mockResolvedValue(undefined),
    patchPaths: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
    removeTask: vi.fn().mockResolvedValue(undefined), restoreTask: vi.fn(), patchSubtask: vi.fn(),
    adjustMemberPoints: vi.fn().mockResolvedValue({ ok: false, reason: 'offline' }),
    appendHistory: vi.fn(), removeHistoryEntry: vi.fn(),
  };
});
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
vi.mock('../src/backup.js', async orig => ({ ...(await orig()), downloadBackup: vi.fn(() => true) }));
import * as fb from '../src/firebase.js';
import { CONNECTING_MSG } from '../src/writegate.js';
import { adjustBonus } from '../src/bonus.js';
import { setAway, clearAway, checkAwayExpiry } from '../src/away.js';
import { setPause, clearPause, checkPauseExpiry } from '../src/pause.js';
import { addStarterChores } from '../src/starter.js';
import { prepareRestore, confirmRestore } from '../src/restore.js';
import { deleteTask } from '../src/tasks.js';
import { bulkDelete, bulkAssign, getSelectedIds, initRender } from '../src/render.js';

const toast = () => document.getElementById('toast').textContent;
const admin = () => true;
const wrote = () => [fb.patchTask, fb.patchMember, fb.patchPaths, fb.patchRoot, fb.removeTask, fb.adjustMemberPoints].some(f => f.mock.calls.length);

beforeEach(() => {
  vi.clearAllMocks();
  fb.setWritesEnabled(false);
  state.members = { Ann: { name: 'Ann', role: 'admin', points: 50 } };
  state.tasks = { a: { id: 'a', name: 'Dishes', freq: 'daily', done: false, lastDone: 0, person: 'Ann' } };
  state.pause = null; state.nextId = 5;
  document.body.innerHTML = '<div id="toast"></div>';
  vi.stubGlobal('confirm', () => true);
});
afterEach(() => { fb.setWritesEnabled(true); vi.unstubAllGlobals(); });

describe('remaining entry points while cached data is showing (#216)', () => {
  it('adjustBonus says still connecting, not "Points update failed"', async () => {
    expect(await adjustBonus('Ann', 5, 'Nice', admin, () => 'Ann')).toBe(false);
    expect(toast()).toBe(CONNECTING_MSG);
    expect(fb.adjustMemberPoints).not.toHaveBeenCalled();
  });
  it('setAway shows the message and leaves the member untouched', async () => {
    expect(await setAway('Ann', '2099-01-01', admin)).toBe(false);
    expect(toast()).toBe(CONNECTING_MSG);
    expect(state.members.Ann.awayUntil).toBeUndefined(); expect(wrote()).toBe(false);
  });
  it('clearAway shows the message and keeps the away period', async () => {
    state.members.Ann.awayUntil = '2099-01-01';
    expect(await clearAway('Ann', admin)).toBe(false);
    expect(toast()).toBe(CONNECTING_MSG);
    expect(state.members.Ann.awayUntil).toBe('2099-01-01'); expect(wrote()).toBe(false);
  });
  it('automatic away expiry does nothing locally while not live', () => {
    state.members.Ann.awayUntil = '2000-01-01';
    checkAwayExpiry(Date.UTC(2026, 9, 27));
    expect(state.members.Ann.awayUntil).toBe('2000-01-01'); expect(wrote()).toBe(false);
  });
  it('setPause and clearPause show the message and do not pause/resume locally', async () => {
    await setPause('2099-01-01', admin, () => 'Ann');
    expect(toast()).toBe(CONNECTING_MSG); expect(state.pause).toBeNull();
    state.pause = { until: '2099-01-01', by: 'Ann', since: 1 };
    await clearPause(admin);
    expect(state.pause).not.toBeNull(); expect(wrote()).toBe(false);
  });
  it('automatic pause expiry does nothing locally while not live', () => {
    state.pause = { until: '2000-01-01', by: 'Ann', since: 1 };
    checkPauseExpiry(Date.UTC(2026, 9, 27));
    expect(state.pause).not.toBeNull(); expect(wrote()).toBe(false);
  });
  it('addStarterChores adds nothing and keeps nextId', async () => {
    expect(await addStarterChores(['Wash the dishes'], admin)).toBe(0);
    expect(toast()).toBe(CONNECTING_MSG);
    expect(state.nextId).toBe(5); expect(Object.keys(state.tasks)).toEqual(['a']); expect(wrote()).toBe(false);
  });
  it('confirmRestore does not restore or claim success', async () => {
    document.body.insertAdjacentHTML('beforeend', '<div id="restore-summary"></div><input id="restore-confirm"><button id="restore-go"></button><div id="restore-modal" class="hidden"></div>');
    fb.setWritesEnabled(true);
    const file = { text: async () => JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), nextId: 5, members: { Ann: { name: 'Ann', role: 'admin' } }, tasks: {}, history: [] }) };
    await prepareRestore(file, admin);
    fb.setWritesEnabled(false);
    expect(await confirmRestore('RESTORE', admin)).toBe(false);
    expect(toast()).not.toBe('Backup restored');
    expect(fb.patchRoot).not.toHaveBeenCalled();
  });
  it('deleteTask and bulkDelete/bulkAssign do not remove, undo-register or mutate', async () => {
    await deleteTask('a', admin);
    expect(toast()).toBe(CONNECTING_MSG); expect(fb.removeTask).not.toHaveBeenCalled();
    document.getElementById('toast').textContent = '';
    document.body.insertAdjacentHTML('beforeend', '<input id="bulk-person"><div id="bulk-bar"></div>');
    initRender(admin, () => 'Ann'); getSelectedIds().add('a');
    await bulkDelete();
    expect(toast()).toBe(CONNECTING_MSG); expect(fb.removeTask).not.toHaveBeenCalled();
    document.getElementById('bulk-person').value = 'Bob';
    await bulkAssign();
    expect(state.tasks.a.person).toBe('Ann'); expect(fb.patchPaths).not.toHaveBeenCalled();
  });
});

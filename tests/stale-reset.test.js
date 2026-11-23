// #388: a device that slept offline must not reset a newer completion. Firebase mocked; no live DB.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), set: vi.fn(), remove: vi.fn(),
  update: vi.fn(), onValue: vi.fn(), runTransaction: vi.fn(),
}));

async function setup(readonly = false) {
  vi.resetModules();
  if (readonly) vi.doMock('../src/config.js', async () => ({ ...(await vi.importActual('../src/config.js')), READONLY: true }));
  else vi.doUnmock('../src/config.js');
  const sdk = await import('firebase/database');
  sdk.runTransaction.mockReset(); sdk.update.mockReset();
  const fb = await import('../src/firebase.js');
  fb.initFirebase();
  return { fb, sdk };
}
const run = (sdk, cur) => { const out = []; sdk.runTransaction.mockImplementation(async (r, fn) => { const v = fn(cur); out.push(v); return { committed: v !== undefined }; }); return out; };
const patch = { 'tasks/a/done': false, 'tasks/a/lastDoneBy': null, 'tasks/a/lastDonePoints': null, 'tasks/a/subtasks/s1/done': false, 'tasks/a/person': 'Bo' };

describe('resetTasks (#388)', () => {
  it('applies the reset when the server lastDone matches what this device saw', async () => {
    const { fb, sdk } = await setup();
    const out = run(sdk, { id: 'a', done: true, lastDone: 100, lastDoneBy: 'Al', lastDonePoints: 2, person: 'Al', subtasks: { s1: { id: 's1', done: true } } });
    await fb.resetTasks(patch, { a: 100 });
    expect(out[0]).toMatchObject({ done: false, lastDoneBy: null, lastDonePoints: null, person: 'Bo', subtasks: { s1: { done: false } } });
  });
  it('leaves a newer completion alone (server lastDone differs)', async () => {
    const { fb, sdk } = await setup();
    const out = run(sdk, { id: 'a', done: true, lastDone: 999, lastDoneBy: 'Bo', lastDonePoints: 2 });
    await fb.resetTasks(patch, { a: 100 });
    expect(out[0]).toBeUndefined();
  });
  it('does nothing when another device already reset it', async () => {
    const { fb, sdk } = await setup();
    const out = run(sdk, { id: 'a', done: false, lastDone: 100 });
    await fb.resetTasks(patch, { a: 100 });
    expect(out[0]).toBeUndefined();
  });
  it('does nothing when the task was deleted', async () => {
    const { fb, sdk } = await setup();
    const out = run(sdk, null);
    await fb.resetTasks(patch, { a: 100 });
    expect(out[0]).toBeUndefined();
  });
  it('writes nothing in READONLY', async () => {
    const { fb, sdk } = await setup(true);
    await fb.resetTasks(patch, { a: 100 });
    expect(sdk.runTransaction).not.toHaveBeenCalled();
  });
  it('writes nothing while showing cached data', async () => {
    const { fb, sdk } = await setup();
    fb.setWritesEnabled(false);
    await fb.resetTasks(patch, { a: 100 });
    expect(sdk.runTransaction).not.toHaveBeenCalled();
  });
});

describe('checkTaskResets while offline (#388)', () => {
  const NOW = new Date(2026, 10, 18, 7, 0).getTime();
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => vi.useRealTimers());
  async function load() {
    vi.resetModules();
    const fb = { resetTasks: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn(), takeCheckPending: vi.fn(), adjustMemberPoints: vi.fn(), appendHistory: vi.fn(), removeHistoryEntry: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(), writeState: vi.fn() };
    vi.doMock('../src/firebase.js', () => fb);
    vi.doMock('../src/ui.js', () => ({ showToast: vi.fn() }));
    vi.doMock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
    const { state } = await import('../src/state.js');
    const conn = await import('../src/connection.js');
    const { checkTaskResets } = await import('../src/tasks.js');
    state.members = {}; state.pause = null;
    state.tasks = { a: { id: 'a', name: 'A', freq: 'daily', done: true, lastDone: NOW - 2 * 86400000, lastDoneBy: 'Al', lastDonePoints: 2 } };
    return { fb, state, conn, checkTaskResets };
  }
  it('writes nothing and keeps the local copy while disconnected', async () => {
    const { fb, state, conn, checkTaskResets } = await load();
    conn.setConnection(false);
    checkTaskResets();
    expect(fb.resetTasks).not.toHaveBeenCalled();
    expect(fb.patchRoot).not.toHaveBeenCalled();
    expect(state.tasks.a.done).toBe(true);
  });
  it('online: passes the lastDone it saw so the server can refuse a stale reset', async () => {
    const { fb, conn, checkTaskResets } = await load();
    conn.setConnection(true);
    checkTaskResets();
    expect(fb.resetTasks).toHaveBeenCalledWith(expect.objectContaining({ 'tasks/a/done': false }), { a: NOW - 2 * 86400000 });
  });
});

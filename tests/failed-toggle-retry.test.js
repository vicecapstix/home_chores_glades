import { describe, it, expect, vi, beforeEach } from 'vitest';

// #271: a failed tick/untick must not be offered as a raw task-write retry
// (that would save "done" without points/history). Real firebase.js + pending.js,
// Firebase SDK mocked; never touches a live DB.
let updateImpl;
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), set: vi.fn(), remove: vi.fn(),
  update: (...a) => updateImpl(...a), onValue: vi.fn(), runTransaction: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));

let fb, pending, tasks, state;
const me = () => 'Al', notAdmin = () => false;
beforeEach(async () => {
  vi.resetModules();
  ({ state } = await import('../src/state.js'));
  pending = await import('../src/pending.js');
  fb = await import('../src/firebase.js');
  tasks = await import('../src/tasks.js');
  fb.initFirebase();
  state.members = { Al: { name: 'Al', role: 'member', points: 0 } };
  state.tasks = { t1: { id: 't1', name: 'Bins', freq: 'daily', person: 'Al', done: false, lastDone: 0 } };
});

describe('failed toggle retry (#271)', () => {
  it('does not offer a raw task-write retry after a failed tick', async () => {
    updateImpl = vi.fn().mockRejectedValue(new Error('NETWORK'));
    await tasks.toggleTask('t1', me, notAdmin);
    expect(updateImpl).toHaveBeenCalledTimes(1);
    const html = pending.syncTagHTML('t1');
    expect(html).toContain('not saved');
    expect(html).toContain('tap the chore again');
    expect(html).not.toContain('retrySync');
    expect(await pending.retrySync('t1')).toBe(false);
    expect(updateImpl).toHaveBeenCalledTimes(1); // nothing replayed
  });

  it('tapping the chore again re-runs the whole toggle and clears the tag', async () => {
    updateImpl = vi.fn().mockRejectedValueOnce(new Error('NETWORK')).mockResolvedValue(undefined);
    await tasks.toggleTask('t1', me, notAdmin);
    await tasks.toggleTask('t1', me, notAdmin);
    expect(updateImpl).toHaveBeenCalledTimes(2);
    expect(updateImpl.mock.calls[1][1]).toMatchObject({ done: true, lastDoneBy: 'Al', lastDonePoints: 1 });
    expect(pending.syncState('t1')).toBe('');
  });

  it('keeps the tap-to-retry button for non-toggle writes (edit, subtasks)', async () => {
    updateImpl = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined);
    await fb.patchTask('t1', { name: 'Bins!' }).catch(() => {});
    expect(pending.syncTagHTML('t1')).toContain("window.retrySync('t1')");
    expect(await pending.retrySync('t1')).toBe(true);
    expect(pending.syncState('t1')).toBe('');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
  adjustMemberPoints: vi.fn().mockResolvedValue({ ok: true }),
  appendHistory: vi.fn().mockResolvedValue(undefined),
  removeHistoryEntry: vi.fn().mockResolvedValue({ removed: false }),
  patchPaths: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchTask, appendHistory, adjustMemberPoints } from '../src/firebase.js';
import { toggleTask } from '../src/tasks.js';

const me = () => 'Bob', notAdmin = () => false;
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

beforeEach(() => {
  vi.clearAllMocks();
  state.members = { Bob: { name: 'Bob', role: 'member', points: 0 } };
  state.tasks = {
    a: { id: 'a', name: 'A', freq: 'daily', person: 'Bob', done: false, lastDone: 0 },
    b: { id: 'b', name: 'B', freq: 'daily', person: 'Bob', done: false, lastDone: 0 },
  };
});

describe('toggleTask in-flight guard (#218)', () => {
  it('ignores a second toggle of the same task while the first is in flight', async () => {
    const d = deferred();
    patchTask.mockImplementationOnce(() => d.promise);
    const first = toggleTask('a', me, notAdmin);
    await Promise.resolve();
    await toggleTask('a', me, notAdmin);
    expect(patchTask).toHaveBeenCalledTimes(1);
    d.resolve(); await first;
    expect(appendHistory).toHaveBeenCalledTimes(1);
    expect(adjustMemberPoints).toHaveBeenCalledTimes(1);
  });
  it('does not block a different task', async () => {
    const d = deferred();
    patchTask.mockImplementationOnce(() => d.promise);
    const first = toggleTask('a', me, notAdmin);
    await Promise.resolve();
    await toggleTask('b', me, notAdmin);
    expect(patchTask).toHaveBeenCalledWith('b', expect.objectContaining({ done: true }));
    d.resolve(); await first;
  });
  it('releases the guard after success', async () => {
    await toggleTask('a', me, notAdmin);
    patchTask.mockClear();
    await toggleTask('a', me, notAdmin);
    expect(patchTask).toHaveBeenCalledTimes(1);
  });
  it('releases the guard after an error', async () => {
    patchTask.mockRejectedValueOnce(new Error('boom'));
    await toggleTask('a', me, notAdmin);
    patchTask.mockClear();
    await toggleTask('a', me, notAdmin);
    expect(patchTask).toHaveBeenCalledTimes(1);
  });
});

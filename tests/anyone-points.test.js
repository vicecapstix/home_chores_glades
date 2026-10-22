import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { toggleTask } from '../src/tasks.js';

vi.mock('../src/firebase.js', () => ({
  writeState:   vi.fn().mockResolvedValue(undefined),
  patchTask:    vi.fn().mockResolvedValue(undefined),
  patchMember:  vi.fn().mockResolvedValue(undefined),
  patchRoot:    vi.fn().mockResolvedValue(undefined),
  removeTask:   vi.fn().mockResolvedValue(undefined),
  restoreTask:  vi.fn().mockResolvedValue(undefined),
  patchSubtask: vi.fn().mockResolvedValue(undefined),
  adjustMemberPoints: vi.fn().mockResolvedValue({ ok: true }),
  appendHistory: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));

import { adjustMemberPoints, appendHistory, patchTask, patchMember, patchRoot } from '../src/firebase.js';

const isAdmin = () => true;
const notAdmin = () => false;

function member(name) {
  return { name, role: 'member', points: 10, weekPoints: 0, weekStart: '2026-05-11',
    completedCount: 0, streak: 0, lastStreakDate: null, badges: [], pinHash: '' };
}
function anyoneTask(over = {}) {
  return { id: 't1', name: 'Bins', freq: 'weekly', difficulty: 'easy', done: false, lastDone: 0,
    person: '', lastDoneBy: null, lastDonePoints: null, subtasks: {}, order: 1, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-13T12:00:00.000Z'));
  state.members = { Alice: member('Alice'), Bob: member('Bob') };
  state.tasks = { t1: anyoneTask() };
  state.history = [];
});
afterEach(() => vi.useRealTimers());

describe('Anyone task completion (#43)', () => {
  it('awards points, lastDoneBy and history to the logged-in member', async () => {
    await toggleTask('t1', () => 'Alice', notAdmin);
    expect(patchTask).toHaveBeenCalledWith('t1', expect.objectContaining({
      done: true, lastDoneBy: 'Alice', lastDonePoints: 3,
    }));
    expect(adjustMemberPoints).toHaveBeenCalledWith('Alice', expect.objectContaining({ pts: 3, count: 1 }));
    expect(appendHistory).toHaveBeenCalledTimes(1);
    expect(appendHistory.mock.calls[0][0]).toMatchObject({ taskId: 't1', person: 'Alice', points: 3 });
  });

  it('unchecking reverses the points from whoever earned them', async () => {
    state.tasks.t1 = anyoneTask({ done: true, lastDoneBy: 'Alice', lastDonePoints: 3 });
    state.members.Alice.points = 13;
    state.members.Alice.completedCount = 1;
    await toggleTask('t1', () => 'Bob', isAdmin);
    expect(adjustMemberPoints).toHaveBeenCalledWith('Alice', expect.objectContaining({ pts: -3, count: -1 }));
  });

  it('awards nothing and does not crash with no logged-in member', async () => {
    await toggleTask('t1', () => '', isAdmin);
    expect(patchTask).toHaveBeenCalledWith('t1', expect.objectContaining({ done: true }));
    expect(patchTask.mock.calls[0][1].lastDoneBy).toBeUndefined();
    expect(patchMember).not.toHaveBeenCalled();
    expect(patchRoot).not.toHaveBeenCalled();
  });

  it('awards nothing in setup mode (no members)', async () => {
    state.members = {};
    await toggleTask('t1', () => 'Ghost', isAdmin);
    expect(patchMember).not.toHaveBeenCalled();
    expect(patchRoot).not.toHaveBeenCalled();
  });

  it('assigned tasks still award the assignee, not the ticker', async () => {
    state.tasks.t1 = anyoneTask({ person: 'Bob' });
    await toggleTask('t1', () => 'Alice', isAdmin);
    expect(adjustMemberPoints).toHaveBeenCalledWith('Bob', expect.any(Object));
    expect(adjustMemberPoints).not.toHaveBeenCalledWith('Alice', expect.any(Object));
  });
});

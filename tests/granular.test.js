import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { writeState, patchTask, patchRoot, patchSubtask } from '../src/firebase.js';
import { checkTaskResets, claimTask, addSubtask, removeSubtask } from '../src/tasks.js';

// Wednesday 2026-10-14 12:00 local
const NOW = new Date(2026, 9, 14, 12).getTime();
const DAY = 86400000;
const admin = () => true;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.members = {};
  state.tasks = {};
});
afterEach(() => vi.useRealTimers());

describe('checkTaskResets uses one multi-path update', () => {
  it('resets only changed tasks and never calls writeState', () => {
    state.tasks = {
      a: { id: 'a', name: 'A', freq: 'daily', done: true, lastDone: NOW - 2 * DAY, lastDoneBy: 'Al', lastDonePoints: 2 },
      b: { id: 'b', name: 'B', freq: 'weekly', done: true, lastDone: NOW - DAY, lastDoneBy: 'Al', lastDonePoints: 3 },
      c: { id: 'c', name: 'C', freq: 'daily', done: false, lastDone: 0 },
    };
    checkTaskResets();
    expect(writeState).not.toHaveBeenCalled();
    expect(patchRoot).toHaveBeenCalledTimes(1);
    expect(patchRoot).toHaveBeenCalledWith({
      'tasks/a/done': false, 'tasks/a/lastDoneBy': null, 'tasks/a/lastDonePoints': null,
    });
  });

  it('resets a weekday task whose scheduled day has begun since lastDone', () => {
    // Tuesday (2) scheduled; last done Monday; today is Wednesday
    state.tasks = {
      w: { id: 'w', name: 'W', freq: 'weekdays', days: [2], done: true, lastDone: new Date(2026, 9, 12, 9).getTime(), lastDoneBy: 'Al', lastDonePoints: 1 },
    };
    checkTaskResets();
    expect(writeState).not.toHaveBeenCalled();
    expect(patchRoot).toHaveBeenCalledWith({
      'tasks/w/done': false, 'tasks/w/lastDoneBy': null, 'tasks/w/lastDonePoints': null,
    });
  });

  it('does not write at all when nothing is due', () => {
    state.tasks = { a: { id: 'a', name: 'A', freq: 'weekly', done: true, lastDone: NOW - DAY } };
    checkTaskResets();
    expect(patchRoot).not.toHaveBeenCalled();
    expect(writeState).not.toHaveBeenCalled();
  });
});

describe('claim and subtasks use granular writes', () => {
  it('claimTask patches only person', async () => {
    state.tasks = { t1: { id: 't1', name: 'T', freq: 'daily', person: '' } };
    await claimTask('t1', () => 'Alice');
    expect(writeState).not.toHaveBeenCalled();
    expect(patchTask).toHaveBeenCalledWith('t1', { person: 'Alice' });
  });

  it('addSubtask patches a single subtask path', async () => {
    state.tasks = { t1: { id: 't1', name: 'T', freq: 'daily', subtasks: {} } };
    document.body.innerHTML = '<div id="tc-t1"><div class="subtask-add"><input value="Wipe"></div></div>';
    await addSubtask('t1', admin);
    expect(writeState).not.toHaveBeenCalled();
    expect(patchSubtask).toHaveBeenCalledTimes(1);
    const [tid, sid, fields] = patchSubtask.mock.calls[0];
    expect(tid).toBe('t1');
    expect(sid).toMatch(/^s\d+$/);
    expect(fields).toEqual({ id: sid, name: 'Wipe', done: false });
  });

  it('removeSubtask nulls exactly one subtask path', async () => {
    state.tasks = { t1: { id: 't1', name: 'T', freq: 'daily', subtasks: { s1: { id: 's1', name: 'x', done: false }, s2: { id: 's2', name: 'y', done: false } } } };
    await removeSubtask('t1', 's1', admin);
    expect(writeState).not.toHaveBeenCalled();
    expect(patchRoot).toHaveBeenCalledWith({ 'tasks/t1/subtasks/s1': null });
  });

  it('subtask add/remove stay admin-only', async () => {
    state.tasks = { t1: { id: 't1', name: 'T', freq: 'daily', subtasks: { s1: { id: 's1', name: 'x', done: false } } } };
    document.body.innerHTML = '<div id="tc-t1"><div class="subtask-add"><input value="Wipe"></div></div>';
    await addSubtask('t1', () => false);
    await removeSubtask('t1', 's1', () => false);
    expect(patchSubtask).not.toHaveBeenCalled();
    expect(patchRoot).not.toHaveBeenCalled();
    expect(state.tasks.t1.subtasks.s1).toBeDefined();
  });
});

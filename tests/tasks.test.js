import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { checkTaskResets, toggleTask, deleteTask, claimTask } from '../src/tasks.js';

vi.mock('../src/firebase.js', () => ({
  writeState:    vi.fn().mockResolvedValue(undefined),
  patchTask:     vi.fn().mockResolvedValue(undefined),
  patchMember:   vi.fn().mockResolvedValue(undefined),
  patchRoot:     vi.fn().mockResolvedValue(undefined),
  removeTask:    vi.fn().mockResolvedValue(undefined),
  restoreTask:   vi.fn().mockResolvedValue(undefined),
  patchSubtask:  vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/ui.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('../src/undo.js', () => ({
  pushUndo: vi.fn(),
}));

import { writeState, patchTask, patchMember, patchRoot, removeTask } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { pushUndo } from '../src/undo.js';

// Fixed date: Wednesday 2026-05-13. Week starts Monday 2026-05-11.
const FIXED_DATE = new Date('2026-05-13T12:00:00.000Z');

const isAdmin     = () => true;
const notAdmin    = () => false;
const asAlice     = () => 'Alice';
const noSession   = () => '';

function makeTask(overrides = {}) {
  return {
    id: 't1', name: 'Dishes', freq: 'weekly', difficulty: 'easy',
    done: false, lastDone: 0, person: 'Alice',
    lastDoneBy: null, lastDonePoints: null,
    subtasks: {}, order: 1,
    ...overrides,
  };
}

function makeMember(overrides = {}) {
  return {
    name: 'Alice', role: 'admin',
    points: 0, weekPoints: 0, weekStart: '2026-05-11',
    completedCount: 0, streak: 0, lastStreakDate: null,
    badges: [], pinHash: '',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_DATE);
  state.members   = {};
  state.tasks     = {};
  state.history   = [];
  state.nextId    = 1;
  state.templates = {};
});

afterEach(() => {
  vi.useRealTimers();
});

// ── checkTaskResets ────────────────────────────────────────────────────────────

describe('checkTaskResets', () => {
  it('resets a done task whose period has elapsed', () => {
    state.tasks.t1 = makeTask({ done: true, lastDone: FIXED_DATE.getTime() - 8 * 86400000 }); // 8d ago for weekly
    checkTaskResets();
    expect(state.tasks.t1.done).toBe(false);
    expect(state.tasks.t1.lastDoneBy).toBeNull();
    expect(state.tasks.t1.lastDonePoints).toBeNull();
  });
  it('calls writeState when at least one task was reset', () => {
    state.tasks.t1 = makeTask({ done: true, lastDone: FIXED_DATE.getTime() - 8 * 86400000 });
    checkTaskResets();
    expect(writeState).toHaveBeenCalledOnce();
  });
  it('does NOT reset a done task that is still within its period', () => {
    state.tasks.t1 = makeTask({ done: true, lastDone: FIXED_DATE.getTime() - 3 * 86400000 }); // 3d ago, weekly
    checkTaskResets();
    expect(state.tasks.t1.done).toBe(true);
    expect(writeState).not.toHaveBeenCalled();
  });
  it('does NOT reset a task that is already undone', () => {
    state.tasks.t1 = makeTask({ done: false, lastDone: FIXED_DATE.getTime() - 8 * 86400000 });
    checkTaskResets();
    expect(state.tasks.t1.done).toBe(false);
    expect(writeState).not.toHaveBeenCalled();
  });
  it('skips "once" frequency tasks entirely', () => {
    state.tasks.t1 = makeTask({ freq: 'once', done: true, lastDone: FIXED_DATE.getTime() - 30 * 86400000 });
    checkTaskResets();
    expect(state.tasks.t1.done).toBe(true);
    expect(writeState).not.toHaveBeenCalled();
  });
  it('does NOT call writeState when nothing changed', () => {
    state.tasks.t1 = makeTask({ done: false });
    checkTaskResets();
    expect(writeState).not.toHaveBeenCalled();
  });
});

// ── toggleTask ────────────────────────────────────────────────────────────────

describe('toggleTask', () => {
  it('patches the task to done:true when it was undone', async () => {
    state.tasks.t1 = makeTask({ done: false });
    state.members.Alice = makeMember();
    await toggleTask('t1', asAlice, isAdmin);
    expect(patchTask).toHaveBeenCalledWith('t1', expect.objectContaining({ done: true }));
  });
  it('patches the task to done:false when it was done', async () => {
    state.tasks.t1 = makeTask({ done: true, lastDoneBy: 'Alice', lastDonePoints: 3 });
    state.members.Alice = makeMember({ points: 3, completedCount: 1, weekPoints: 3 });
    await toggleTask('t1', asAlice, isAdmin);
    expect(patchTask).toHaveBeenCalledWith('t1', expect.objectContaining({ done: false }));
  });
  it('awards points to the task owner on check', async () => {
    state.tasks.t1 = makeTask({ done: false, difficulty: 'medium', freq: 'weekly' }); // 3×2=6pts
    state.members.Alice = makeMember({ points: 10 });
    await toggleTask('t1', asAlice, isAdmin);
    expect(patchMember).toHaveBeenCalledWith('Alice', expect.objectContaining({ points: 16 }));
  });
  it('increments completedCount on check', async () => {
    state.tasks.t1 = makeTask({ done: false });
    state.members.Alice = makeMember({ completedCount: 4 });
    await toggleTask('t1', asAlice, isAdmin);
    expect(patchMember).toHaveBeenCalledWith('Alice', expect.objectContaining({ completedCount: 5 }));
  });
  it('extends streak by 1 when last done yesterday', async () => {
    state.tasks.t1 = makeTask({ done: false });
    state.members.Alice = makeMember({ streak: 5, lastStreakDate: '2026-05-12' }); // yesterday
    await toggleTask('t1', asAlice, isAdmin);
    expect(patchMember).toHaveBeenCalledWith('Alice', expect.objectContaining({ streak: 6 }));
  });
  it('resets streak to 1 when last done before yesterday', async () => {
    state.tasks.t1 = makeTask({ done: false });
    state.members.Alice = makeMember({ streak: 10, lastStreakDate: '2026-05-10' });
    await toggleTask('t1', asAlice, isAdmin);
    expect(patchMember).toHaveBeenCalledWith('Alice', expect.objectContaining({ streak: 1 }));
  });
  it('reverses points when unchecking', async () => {
    state.tasks.t1 = makeTask({ done: true, lastDoneBy: 'Alice', lastDonePoints: 6 });
    state.members.Alice = makeMember({ points: 20, completedCount: 5, weekPoints: 6, weekStart: '2026-05-11' });
    await toggleTask('t1', asAlice, isAdmin);
    expect(patchMember).toHaveBeenCalledWith('Alice', expect.objectContaining({ points: 14 }));
  });
  it('does not allow points to go below 0 on reversal', async () => {
    state.tasks.t1 = makeTask({ done: true, lastDoneBy: 'Alice', lastDonePoints: 100 });
    state.members.Alice = makeMember({ points: 3, completedCount: 1 });
    await toggleTask('t1', asAlice, isAdmin);
    expect(patchMember).toHaveBeenCalledWith('Alice', expect.objectContaining({ points: 0 }));
  });
  it('earns the "first" badge on first ever completion', async () => {
    state.tasks.t1 = makeTask({ done: false });
    state.members.Alice = makeMember({ completedCount: 0, badges: [] });
    await toggleTask('t1', asAlice, isAdmin);
    expect(patchMember).toHaveBeenCalledWith(
      'Alice',
      expect.objectContaining({ badges: expect.arrayContaining(['first']) })
    );
  });
  it('does not re-award a badge already earned', async () => {
    state.tasks.t1 = makeTask({ done: false });
    state.members.Alice = makeMember({ completedCount: 5, badges: ['first'] });
    await toggleTask('t1', asAlice, isAdmin);
    const call = patchMember.mock.calls.find(c => c[0] === 'Alice' && c[1].badges);
    // No badge update — badges array should not appear in the call
    expect(call).toBeUndefined();
  });
  it('appends a history entry when checking', async () => {
    state.tasks.t1 = makeTask({ done: false });
    state.members.Alice = makeMember();
    await toggleTask('t1', asAlice, isAdmin);
    expect(patchRoot).toHaveBeenCalledWith(
      expect.objectContaining({ history: expect.arrayContaining([
        expect.objectContaining({ taskId: 't1', person: 'Alice' })
      ])})
    );
  });
  it('non-admin cannot toggle another member\'s task', async () => {
    state.tasks.t1 = makeTask({ done: false, person: 'Bob' });
    state.members.Alice = makeMember();
    await toggleTask('t1', asAlice, notAdmin);
    expect(patchTask).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Only your own tasks can be checked');
  });
  it('non-admin can toggle an unassigned task', async () => {
    state.tasks.t1 = makeTask({ done: false, person: '' });
    state.members.Alice = makeMember();
    await toggleTask('t1', asAlice, notAdmin);
    // No person → no member points update, but patchTask should be called
    expect(patchTask).toHaveBeenCalledOnce();
  });
  it('is a no-op when the task does not exist', async () => {
    await toggleTask('missing', asAlice, isAdmin);
    expect(patchTask).not.toHaveBeenCalled();
  });
});

// ── deleteTask ────────────────────────────────────────────────────────────────

describe('deleteTask', () => {
  it('calls removeTask with the task id', async () => {
    state.tasks.t1 = makeTask();
    await deleteTask('t1', isAdmin);
    expect(removeTask).toHaveBeenCalledWith('t1');
  });
  it('pushes an undo command with the task name as label', async () => {
    state.tasks.t1 = makeTask({ name: 'Mow Lawn' });
    await deleteTask('t1', isAdmin);
    expect(pushUndo).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Mow Lawn' })
    );
  });
  it('non-admin cannot delete', async () => {
    state.tasks.t1 = makeTask();
    await deleteTask('t1', notAdmin);
    expect(removeTask).not.toHaveBeenCalled();
  });
  it('is a no-op when task does not exist', async () => {
    await deleteTask('missing', isAdmin);
    expect(removeTask).not.toHaveBeenCalled();
  });
});

// ── claimTask ─────────────────────────────────────────────────────────────────

describe('claimTask', () => {
  it('assigns the current member as the task owner', async () => {
    state.tasks.t1 = makeTask({ person: '' });
    await claimTask('t1', asAlice);
    expect(writeState).toHaveBeenCalledOnce();
    expect(state.tasks.t1.person).toBe('Alice');
  });
  it('shows a toast and does not write when no member is logged in', async () => {
    state.tasks.t1 = makeTask({ person: '' });
    await claimTask('t1', noSession);
    expect(writeState).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Select a member first');
  });
});

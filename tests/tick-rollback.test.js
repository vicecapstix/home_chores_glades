import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { toggleTask } from '../src/tasks.js';

let adjust = { ok: false, reason: 'missing' };
let adjustThrows = false;
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(), patchRoot: vi.fn(),
  takeCheckPending: vi.fn(), removeHistoryEntry: vi.fn(),
  patchTask: vi.fn(async (id, f) => { Object.assign(state.tasks[id], f); }),
  patchMember: vi.fn(async (n, f) => { Object.assign(state.members[n], f); }),
  appendHistory: vi.fn(async () => ({ ok: true })),
  adjustMemberPoints: vi.fn(async () => { if (adjustThrows) throw new Error('boom'); return adjust; }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { showToast } from '../src/ui.js';
import { appendHistory } from '../src/firebase.js';

beforeEach(() => {
  vi.clearAllMocks(); adjust = { ok: false, reason: 'missing' }; adjustThrows = false;
  state.members = { Amy: { name: 'Amy', role: 'member', points: 0, weekPoints: 0, weekStart: '2000-01-03', completedCount: 0, streak: 0, badges: [] } };
  state.tasks = { t1: { id: 't1', name: 'Bins', freq: 'daily', difficulty: 'easy', done: false, lastDone: 111, person: 'Amy', subtasks: {} } };
  state.history = [];
});

describe('tick whose points update fails is rolled back (#379)', () => {
  it('ok:false leaves the chore not done with no lastDone* fields', async () => {
    await toggleTask('t1', () => 'Amy', () => false);
    const t = state.tasks.t1;
    expect(t.done).toBe(false);
    expect(t.lastDone).toBe(111);
    expect(t.lastDoneBy).toBeNull();
    expect(t.lastDonePoints).toBeNull();
    expect(showToast).toHaveBeenCalledWith('Member update failed');
    expect(appendHistory).not.toHaveBeenCalled();
  });
  it('a thrown error is rolled back too', async () => {
    adjustThrows = true;
    await toggleTask('t1', () => 'Amy', () => false);
    expect(state.tasks.t1.done).toBe(false);
    expect(state.tasks.t1.lastDonePoints).toBeNull();
  });
  it('success path still keeps the chore done with points recorded', async () => {
    adjust = { ok: true };
    await toggleTask('t1', () => 'Amy', () => false);
    expect(state.tasks.t1.done).toBe(true);
    expect(state.tasks.t1.lastDonePoints).toBeGreaterThan(0);
    expect(appendHistory).toHaveBeenCalledTimes(1);
  });
});

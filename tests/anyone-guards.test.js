import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn().mockResolvedValue(undefined),
  adjustMemberPoints: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchTask, patchSubtask, adjustMemberPoints } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { toggleTask, toggleSubtask, editTask } from '../src/tasks.js';

const admin = () => true, notAdmin = () => false;
const as = name => () => name;

beforeEach(() => {
  vi.clearAllMocks();
  state.members = {
    Alice: { name: 'Alice', role: 'admin', points: 5 }, Bob: { name: 'Bob', role: 'member', points: 5 },
    Cy: { name: 'Cy', role: 'member', points: 0 },
  };
  state.tasks = {
    any: { id: 'any', name: 'Bins', freq: 'daily', person: '', done: true, lastDone: Date.now(), lastDoneBy: 'Bob', lastDonePoints: 1,
      subtasks: { s1: { id: 's1', name: 'x', done: false } } },
    mine: { id: 'mine', name: 'Mine', freq: 'daily', person: 'Cy', done: false, lastDone: 0, subtasks: { s1: { id: 's1', name: 'x', done: false } } },
    open: { id: 'open', name: 'Open', freq: 'daily', person: '', done: false, lastDone: 0, subtasks: { s1: { id: 's1', name: 'x', done: false } } },
  };
  document.body.innerHTML = '<div id="tc-open" class="task-card"></div>';
});

describe("unchecking an 'Anyone' chore (#104)", () => {
  it("blocks a member unchecking another member's completion (no points moved)", async () => {
    await toggleTask('any', as('Cy'), notAdmin);
    expect(showToast).toHaveBeenCalled();
    expect(state.tasks.any.done).toBe(true);
    expect(adjustMemberPoints).not.toHaveBeenCalled();
    expect(patchTask).not.toHaveBeenCalled();
  });
  it('lets the member who completed it uncheck it', async () => {
    await toggleTask('any', as('Bob'), notAdmin);
    expect(state.tasks.any.done).toBe(false);
  });
  it('lets an admin uncheck it, and any member tick an unchecked Anyone chore', async () => {
    await toggleTask('any', as('Alice'), admin);
    expect(state.tasks.any.done).toBe(false);
    await toggleTask('open', as('Cy'), notAdmin);
    expect(state.tasks.open.done).toBe(true);
  });
  it('lets a member uncheck a done Anyone chore that has no recorded completer', async () => {
    state.tasks.any.lastDoneBy = null;
    await toggleTask('any', as('Cy'), notAdmin);
    expect(state.tasks.any.done).toBe(false);
  });
});

describe('toggleSubtask follows the same ownership rule (#104)', () => {
  it("blocks a member on someone else's assigned chore", async () => {
    await toggleSubtask('mine', 's1', as('Bob'), notAdmin);
    expect(patchSubtask).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });
  it("blocks a member on another member's completed Anyone chore", async () => {
    await toggleSubtask('any', 's1', as('Cy'), notAdmin);
    expect(patchSubtask).not.toHaveBeenCalled();
  });
  it('allows the assignee, an admin, and an open Anyone chore', async () => {
    await toggleSubtask('mine', 's1', as('Cy'), notAdmin);
    await toggleSubtask('any', 's1', as('Alice'), admin);
    await toggleSubtask('open', 's1', as('Bob'), notAdmin);
    expect(patchSubtask).toHaveBeenCalledTimes(3);
  });
});

describe('editTask admin guard (#104)', () => {
  it('does not open the edit row for a non-admin', () => {
    editTask('open', notAdmin);
    expect(document.getElementById('tc-open').classList.contains('editing')).toBe(false);
  });
  it('opens it for an admin', () => {
    editTask('open', admin);
    expect(document.getElementById('tc-open').classList.contains('editing')).toBe(true);
  });
});

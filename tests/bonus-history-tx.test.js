import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

// #183 — bonus + uncheck must use the transactional history helpers, never patchRoot({history}).
vi.mock('../src/firebase.js', () => ({
  adjustMemberPoints: vi.fn(async () => ({ ok: true, reason: '' })),
  patchRoot: vi.fn().mockResolvedValue(undefined),
  appendHistory: vi.fn().mockResolvedValue({ ok: true }),
  removeHistoryEntry: vi.fn(async () => ({ ok: true, removed: true, rest: [] })),
  patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined),
  writeState: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import * as fb from '../src/firebase.js';
import { pushUndo } from '../src/undo.js';
import { adjustBonus } from '../src/bonus.js';
import { toggleTask } from '../src/tasks.js';

const admin = () => true;
const asDad = () => 'Dad';
const hasHistoryWrite = () => fb.patchRoot.mock.calls.some(c => c[0] && 'history' in c[0]);

beforeEach(() => {
  vi.clearAllMocks();
  state.members = { Alice: { name: 'Alice', role: 'member', points: 10, completedCount: 1 }, Dad: { name: 'Dad', role: 'admin', points: 0 } };
  state.tasks = {};
  state.history = [];
});

describe('bonus history (#183)', () => {
  it('appends via appendHistory with a rules-valid shape (taskName + person)', async () => {
    await adjustBonus('Alice', 5, 'Helped Grandma', admin, asDad);
    expect(hasHistoryWrite()).toBe(false);
    const e = fb.appendHistory.mock.calls[0][0];
    expect(e).toMatchObject({ type: 'bonus', person: 'Alice', points: 5, reason: 'Helped Grandma', by: 'Dad', taskName: 'Bonus: Helped Grandma' });
    // draft rule: history/$i hasChildren(['taskName','person'])
    expect(['taskName', 'person'].every(k => k in e)).toBe(true);
  });
  it('undo removes just its entry via removeHistoryEntry', async () => {
    await adjustBonus('Alice', 5, 'Help', admin, asDad);
    const e = fb.appendHistory.mock.calls[0][0];
    await pushUndo.mock.calls[0][0].undo();
    expect(fb.removeHistoryEntry).toHaveBeenCalledWith({ type: 'bonus', person: 'Alice', completedAt: e.completedAt });
    expect(hasHistoryWrite()).toBe(false);
  });
});

describe('uncheck history (#183)', () => {
  it('removes the completion entry via removeHistoryEntry, not a whole-array write', async () => {
    const at = 1700000000000;
    state.tasks = { t1: { id: 't1', name: 'Bins', freq: 'daily', difficulty: 'easy', done: true, lastDone: at,
      lastDoneBy: 'Alice', lastDonePoints: 1, person: 'Alice', subtasks: {}, order: 1 } };
    state.history = [{ taskId: 't1', taskName: 'Bins', person: 'Alice', completedAt: at, points: 1 }];
    await toggleTask('t1', () => 'Alice', admin);
    expect(fb.removeHistoryEntry).toHaveBeenCalledWith({ taskId: 't1', completedAt: at, person: 'Alice' });
    expect(hasHistoryWrite()).toBe(false);
  });
});

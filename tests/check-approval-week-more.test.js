import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchMember: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
  patchTask: vi.fn(async (id, f) => { Object.assign(state.tasks[id], f); }),
  takeCheckPending: vi.fn(async id => { const p = state.tasks[id].checkPending || null; if (p) state.tasks[id].checkPending = null; return p; }),
  adjustMemberPoints: vi.fn().mockResolvedValue({ ok: true, reason: '' }),
  appendHistory: vi.fn().mockResolvedValue(undefined), removeHistoryEntry: vi.fn().mockResolvedValue({ removed: false }),
}));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchTask, adjustMemberPoints } from '../src/firebase.js';
import { approveCheck, toggleTask } from '../src/tasks.js';

const SUN_TICK = new Date(2026, 10, 1, 20).getTime();
const MON_TICK = new Date(2026, 10, 2, 7).getTime();
const MON_APPROVE = new Date(2026, 10, 2, 8).getTime();
const adm = () => true, me = () => 'Ann';

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers();
  state.members = { Ann: { name: 'Ann', role: 'admin' }, Bo: { name: 'Bo', role: 'member', points: 6, streak: 0 } };
  state.tasks = { a: { id: 'a', name: 'Bathroom', freq: 'weekly', person: 'Bo', done: false, lastDone: SUN_TICK - 9 * 86400000, difficulty: 'medium', needsCheck: true } };
  document.body.innerHTML = '<div id="toast"></div>';
});
afterEach(() => vi.useRealTimers());

describe('same-week approval is unchanged (#272)', () => {
  it('counts in weekPoints and records the current week', async () => {
    state.tasks.a.checkPending = { by: 'Bo', at: MON_TICK };
    vi.setSystemTime(MON_APPROVE);
    await approveCheck('a', adm, me);
    expect(adjustMemberPoints.mock.calls[0][1]).toMatchObject({ pts: 6, count: 1, weekStart: '2026-11-02', countWeek: true });
    expect(patchTask.mock.calls.find(c => c[1].done)[1].lastDoneWeek).toBe('2026-11-02');
  });
});

describe('uncheck reverses the right week (#272)', () => {
  it('late-approved chore: uncheck does not touch the new week', async () => {
    state.tasks.a.checkPending = { by: 'Bo', at: SUN_TICK };
    vi.setSystemTime(MON_APPROVE);
    await approveCheck('a', adm, me);
    expect(state.tasks.a.lastDoneWeek).toBe('2026-10-26');
    adjustMemberPoints.mockClear();
    await toggleTask('a', me, adm);
    expect(adjustMemberPoints.mock.calls[0][1]).toMatchObject({ pts: -6, count: -1, countWeek: false });
  });
  it('same-week chore: uncheck reverses the current week', async () => {
    state.tasks.a.checkPending = { by: 'Bo', at: MON_TICK };
    vi.setSystemTime(MON_APPROVE);
    await approveCheck('a', adm, me);
    adjustMemberPoints.mockClear();
    await toggleTask('a', me, adm);
    expect(adjustMemberPoints.mock.calls[0][1]).toMatchObject({ pts: -6, count: -1, weekStart: '2026-11-02', countWeek: true });
  });
});

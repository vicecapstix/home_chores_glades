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
import { patchTask, adjustMemberPoints, appendHistory } from '../src/firebase.js';
import { approveCheck } from '../src/tasks.js';

const SUN_TICK = new Date(2026, 10, 1, 20).getTime();   // Sun 1 Nov 20:00 (week of 2026-10-26)
const MON_APPROVE = new Date(2026, 10, 2, 8).getTime(); // Mon 2 Nov 08:00 (week of 2026-11-02)
const adm = () => true, me = () => 'Ann';

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers();
  state.members = { Ann: { name: 'Ann', role: 'admin' }, Bo: { name: 'Bo', role: 'member', points: 0, streak: 0 } };
  state.tasks = { a: { id: 'a', name: 'Bathroom', freq: 'weekly', person: 'Bo', done: false, lastDone: SUN_TICK - 9 * 86400000, difficulty: 'medium', needsCheck: true, checkPending: { by: 'Bo', at: SUN_TICK } } };
  document.body.innerHTML = '<div id="toast"></div>';
});
afterEach(() => vi.useRealTimers());

describe('check approved after the week rolled over (#272)', () => {
  it('does not add to the new week; counts in the tick week via lastDoneWeek and history', async () => {
    vi.setSystemTime(MON_APPROVE);
    await approveCheck('a', adm, me);
    const opts = adjustMemberPoints.mock.calls[0][1];
    expect(opts.pts).toBe(6);
    expect(opts.countWeek).toBe(false);
    expect(patchTask.mock.calls.find(c => c[1].done)[1].lastDoneWeek).toBe('2026-10-26');
    expect(appendHistory.mock.calls[0][0]).toMatchObject({ completedAt: SUN_TICK, points: 6 });
  });
});

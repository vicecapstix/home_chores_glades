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
import { toggleTask, approveCheck } from '../src/tasks.js';
import { toCheckHTML } from '../src/tocheck.js';

const TUE = new Date(2026, 10, 17, 19).getTime();   // Tue 17 Nov 19:00 (tick)
const WED = new Date(2026, 10, 18, 7, 30).getTime(); // Wed 18 Nov 07:30 (approve)
const adm = () => true, notAdm = () => false, ann = () => 'Ann', bo = () => 'Bo';

function mk(extra = {}) {
  state.members = { Ann: { name: 'Ann', role: 'admin' }, Bo: { name: 'Bo', role: 'member', points: 0, streak: 0 } };
  state.tasks = { a: { id: 'a', name: 'Bathroom', freq: 'daily', person: 'Bo', done: false, lastDone: 0, difficulty: 'medium', needsCheck: true, ...extra } };
  state.bonusChore = null; state.doublePoints = null;
}
beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); document.body.innerHTML = '<div id="toast"></div>'; mk(); });
afterEach(() => vi.useRealTimers());

const awarded = () => adjustMemberPoints.mock.calls[0][1].pts;

describe('parent check keeps tick-time bonus and multiplier (#387)', () => {
  it('stores bonus and mult on the tick', async () => {
    vi.setSystemTime(TUE);
    state.bonusChore = { date: '2026-11-17', taskId: 'a', extra: 5 };
    state.doublePoints = { date: '2026-11-17', mult: 2 };
    await toggleTask('a', bo, notAdm);
    expect(state.tasks.a.checkPending).toMatchObject({ by: 'Bo', at: TUE, bonus: 5, mult: 2 });
  });
  it('bonus survives the parent changing the bonus chore before approving', async () => {
    mk({ checkPending: { by: 'Bo', at: TUE, bonus: 5, mult: 1 } });
    vi.setSystemTime(WED);
    state.bonusChore = { date: '2026-11-18', taskId: 'a', extra: 9 };
    await approveCheck('a', adm, ann);
    expect(awarded()).toBe(7); // medium daily = 2 base + 5 stored bonus
  });
  it('bonus survives the bonus chore being cleared', async () => {
    mk({ checkPending: { by: 'Bo', at: TUE, bonus: 5, mult: 1 } });
    vi.setSystemTime(WED);
    await approveCheck('a', adm, ann);
    expect(awarded()).toBe(7);
  });
  it('double points survive the day being moved', async () => {
    mk({ checkPending: { by: 'Bo', at: TUE, bonus: 0, mult: 2 } });
    vi.setSystemTime(WED);
    state.doublePoints = { date: '2026-11-18', mult: 3 };
    await approveCheck('a', adm, ann);
    expect(awarded()).toBe(4);
  });
  it('legacy request without fields falls back to live state at tick time', async () => {
    mk({ checkPending: { by: 'Bo', at: TUE } });
    vi.setSystemTime(WED);
    state.doublePoints = { date: '2026-11-17', mult: 2 };
    await approveCheck('a', adm, ann);
    expect(awarded()).toBe(4);
  });
  it('ignores crafted out-of-range stored values', async () => {
    mk({ checkPending: { by: 'Bo', at: TUE, bonus: 9999, mult: 50 } });
    vi.setSystemTime(WED);
    await approveCheck('a', adm, ann);
    expect(awarded()).toBe(2);
  });
  it('uncheck reverses exactly lastDonePoints', async () => {
    mk({ checkPending: { by: 'Bo', at: TUE, bonus: 5, mult: 2 } });
    vi.setSystemTime(WED);
    await approveCheck('a', adm, ann);
    expect(state.tasks.a.lastDonePoints).toBe(9);
    expect(patchTask.mock.calls.find(c => c[1].done)[1].lastDonePoints).toBe(9);
  });
  it('To check list shows the stored points', () => {
    mk({ checkPending: { by: 'Bo', at: TUE, bonus: 5, mult: 2 } });
    state.doublePoints = null;
    expect(toCheckHTML()).toContain('+9 pts');
  });
  it('a non-admin cannot approve', async () => {
    mk({ checkPending: { by: 'Bo', at: TUE, bonus: 5, mult: 1 } });
    await approveCheck('a', notAdm, bo);
    expect(adjustMemberPoints).not.toHaveBeenCalled();
  });
});

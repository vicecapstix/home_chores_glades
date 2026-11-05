import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { nextStreak, currentStreak, freezeTag, setPauseUntil } from '../src/utils.js';
import { tvStripHTML } from '../src/tv.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchMember: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
  patchTask: vi.fn(async (id, f) => { Object.assign(state.tasks[id], f); }),
  takeCheckPending: vi.fn(), adjustMemberPoints: vi.fn().mockResolvedValue({ ok: true, reason: '' }),
  appendHistory: vi.fn().mockResolvedValue(undefined),
  removeHistoryEntry: vi.fn(async () => ({ ok: true, removed: true, rest: [] })),
}));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchMember } from '../src/firebase.js';
import { toggleTask } from '../src/tasks.js';

const NOW = new Date(2026, 10, 5, 12).getTime(); // Thu 5 Nov 2026
const mem = o => ({ name: 'Bo', streak: 5, lastStreakDate: '2026-11-04', freezes: 0, ...o });
afterEach(() => { setPauseUntil(''); vi.useRealTimers(); });

describe('nextStreak (#227)', () => {
  it('earns 1 freeze when the streak reaches 7', () => {
    expect(nextStreak(mem({ streak: 6 }), NOW)).toEqual({ streak: 7, freezes: 1 });
    expect(nextStreak(mem({ streak: 13 }), NOW)).toEqual({ streak: 14, freezes: 1 });
  });
  it('holds at most 2 freezes', () => {
    expect(nextStreak(mem({ streak: 20, freezes: 2 }), NOW)).toEqual({ streak: 21, freezes: 2 });
  });
  it('spends a freeze when the last completion was 2 days ago and the streak continues', () => {
    expect(nextStreak(mem({ lastStreakDate: '2026-11-03', freezes: 1 }), NOW)).toEqual({ streak: 6, freezes: 0 });
  });
  it('resets to 1 with no freeze, or when 3+ days were missed', () => {
    expect(nextStreak(mem({ lastStreakDate: '2026-11-03' }), NOW)).toEqual({ streak: 1, freezes: 0 });
    expect(nextStreak(mem({ lastStreakDate: '2026-11-02', freezes: 2 }), NOW)).toEqual({ streak: 1, freezes: 2 });
  });
  it('never spends a freeze while the house is paused', () => {
    expect(nextStreak(mem({ lastStreakDate: '2026-11-03', freezes: 1 }), NOW, true)).toEqual({ streak: 1, freezes: 1 });
  });
  it('a second completion the same day changes nothing', () => {
    expect(nextStreak(mem({ lastStreakDate: '2026-11-05', freezes: 1 }), NOW)).toEqual({ streak: 5, freezes: 1 });
  });
  it('clamps junk freezes from the DB', () => {
    expect(nextStreak(mem({ freezes: 99 }), NOW).freezes).toBe(2);
    expect(nextStreak(mem({ freezes: -3 }), NOW).freezes).toBe(0);
  });
});

describe('display (#227)', () => {
  it('keeps showing the streak after a 1-day gap only while a freeze is held', () => {
    expect(currentStreak(mem({ lastStreakDate: '2026-11-03', freezes: 1 }), NOW)).toBe(5);
    expect(currentStreak(mem({ lastStreakDate: '2026-11-03', freezes: 0 }), NOW)).toBe(0);
  });
  it('freezeTag and the TV strip show the freeze count', () => {
    expect(freezeTag({ freezes: 2 })).toBe(' ❄️2');
    expect(freezeTag({})).toBe('');
    expect(tvStripHTML({ Bo: { name: 'Bo', streak: 8, lastStreakDate: new Date().toLocaleDateString('sv'), freezes: 1 } }, [])).toContain('❄️1');
  });
});

describe('completing and unchecking a chore (#227)', () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW);
    document.body.innerHTML = '<div id="toast"></div>';
    state.pause = null;
    state.members = { Bo: mem({ lastStreakDate: '2026-11-03', freezes: 1, role: 'member', points: 0 }) };
    state.tasks = { a: { id: 'a', name: 'Dishes', freq: 'daily', person: 'Bo', done: false, lastDone: NOW - 2 * 86400000, difficulty: 'easy' } };
  });
  it('writes streak+1 and spends the freeze', async () => {
    await toggleTask('a', () => true, () => 'Bo');
    expect(patchMember.mock.calls.find(c => c[1].streak !== undefined)[1]).toMatchObject({ streak: 6, lastStreakDate: '2026-11-05', freezes: 0 });
  });
  it('unchecking gives the freeze and old streak back', async () => {
    await toggleTask('a', () => true, () => 'Bo');
    state.members.Bo = { ...state.members.Bo, streak: 6, lastStreakDate: '2026-11-05', freezes: 0 };
    patchMember.mockClear();
    await toggleTask('a', () => true, () => 'Bo');
    expect(patchMember).toHaveBeenCalledWith('Bo', { streak: 5, lastStreakDate: '2026-11-03', freezes: 1 });
  });
  it('does not spend the freeze while paused', async () => {
    setPauseUntil('2026-11-09');
    await toggleTask('a', () => true, () => 'Bo');
    const upd = patchMember.mock.calls.find(c => c[1].streak !== undefined);
    expect(upd[1]).toMatchObject({ streak: 1, freezes: 1 });
  });
});

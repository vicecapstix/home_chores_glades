// #360: bonus chore of the day (state/bonusChore {date, taskId, extra}).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state, applySnapshot } from '../src/state.js';

const cfg = vi.hoisted(() => ({ ro: false }));
vi.mock('../src/config.js', async orig => ({ ...(await orig()), get READONLY() { return cfg.ro; } }));
vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined),
  patchTask: vi.fn(async (id, f) => { Object.assign(state.tasks[id], f); }),
  patchMember: vi.fn(async (n, f) => { Object.assign(state.members[n], f); }),
  patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn(async f => { Object.assign(state, f); }),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
  removeHistoryEntry: vi.fn(async m => {
    const h = state.history || [];
    const idx = h.findIndex(e => e.completedAt === m.completedAt);
    if (idx < 0) return { ok: false, removed: false, rest: h };
    state.history = h.filter((_, i) => i !== idx);
    return { ok: true, removed: true, rest: state.history };
  }),
  appendHistory: vi.fn(async e => { state.history = (state.history || []).concat([e]).slice(-500); return { ok: true }; }),
  adjustMemberPoints: vi.fn(async (n, o) => { const m = state.members[n]; m.points += o.pts; m.completedCount = Math.max(0, m.completedCount + o.count); return { ok: true }; }),
}));
vi.mock('../src/ui.js', async orig => ({ ...(await orig()), showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot } from '../src/firebase.js';
import { toggleTask } from '../src/tasks.js';
import { cardHTML } from '../src/render.js';
import { validBonusChore, bonusFor, setBonusChore, clearBonusChore, bonusChoreAdminHTML, MAX_BONUS } from '../src/bonuschore.js';

const NOW = new Date('2026-05-13T12:00:00').getTime();
const base = { id: 't1', name: 'Clean bathroom', freq: 'weekly', difficulty: 'easy', person: 'Al', done: false, lastDone: NOW - 9 * 86400000, subtasks: {} }; // 3 pts
const admin = () => true, notAdmin = () => false;
const TODAY = '2026-05-13';

beforeEach(() => {
  vi.clearAllMocks(); cfg.ro = false;
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.members = { Al: { name: 'Al', role: 'admin', points: 10, weekPoints: 0, weekStart: '2026-05-11', completedCount: 0, streak: 0, badges: [] } };
  state.tasks = { t1: { ...base }, t2: { ...base, id: 't2', name: 'Bins' } };
  state.history = []; state.doublePoints = null; state.bonusChore = { date: TODAY, taskId: 't1', extra: 5 };
  document.body.innerHTML = '<div id="toast"></div>';
});
afterEach(() => { vi.useRealTimers(); state.bonusChore = null; });

describe('validation', () => {
  it('accepts a known chore and 1..20 whole points, dated today', () => {
    expect(validBonusChore('t1', 5)).toEqual({ date: TODAY, taskId: 't1', extra: 5 });
    expect(validBonusChore('t1', MAX_BONUS)).not.toBeNull();
  });
  it.each([[0], [21], [1.5], ['x'], [-3]])('rejects extra %s', e => expect(validBonusChore('t1', e)).toBeNull());
  it('rejects an unknown or missing chore', () => {
    expect(validBonusChore('nope', 5)).toBeNull();
    expect(validBonusChore('', 5)).toBeNull();
  });
});

describe('bonusFor expires by date and applies to one chore (AC4, AC2)', () => {
  it('only that chore, only today', () => {
    expect(bonusFor(state.tasks.t1)).toBe(5);
    expect(bonusFor(state.tasks.t2)).toBe(0);
    expect(bonusFor(state.tasks.t1, new Date('2026-05-14T09:00:00'))).toBe(0);
    expect(bonusFor(state.tasks.t1, new Date('2026-05-12T09:00:00'))).toBe(0);
  });
  it('ignores a corrupt extra', () => {
    expect(bonusFor(state.tasks.t1, new Date(NOW), { date: TODAY, taskId: 't1', extra: 999 })).toBe(0);
    expect(bonusFor(state.tasks.t1, new Date(NOW), null)).toBe(0);
  });
  it('applySnapshot loads it; one without a taskId is dropped', () => {
    applySnapshot({ nextId: 1, bonusChore: { date: TODAY, taskId: 't1', extra: 7 } });
    expect(state.bonusChore.extra).toBe(7);
    applySnapshot({ nextId: 1, bonusChore: { date: TODAY } });
    expect(state.bonusChore).toBeNull();
  });
});

describe('card tag (AC2): same cardHTML on phone and TV', () => {
  it('shows +N today and the total points on the bonus chore only', () => {
    const html = cardHTML(state.tasks.t1);
    expect(html).toContain('⭐ +5 today');
    expect(html).toContain('+8 pts');
    expect(cardHTML(state.tasks.t2)).not.toContain('today</span>');
  });
  it('hidden the next day and once the chore is done', () => {
    vi.setSystemTime(new Date('2026-05-14T09:00:00'));
    expect(cardHTML(state.tasks.t1)).not.toContain('⭐');
    vi.setSystemTime(NOW);
    expect(cardHTML({ ...state.tasks.t1, done: true })).not.toContain('⭐');
  });
  it('shows on the TV (READONLY)', () => {
    cfg.ro = true;
    expect(cardHTML(state.tasks.t1)).toContain('⭐ +5 today');
  });
});

describe('points (AC3)', () => {
  it('ticking adds the extra to points, history and lastDonePoints; uncheck reverses exactly', async () => {
    await toggleTask('t1', () => 'Al', admin);
    expect(state.tasks.t1.lastDonePoints).toBe(8);
    expect(state.members.Al.points).toBe(18);
    expect(state.history.at(-1).points).toBe(8);
    await toggleTask('t1', () => 'Al', admin);
    expect(state.members.Al.points).toBe(10);
    expect(state.history).toHaveLength(0);
  });
  it('adds after the double-points multiplier', async () => {
    state.doublePoints = { date: TODAY, mult: 2 };
    expect(cardHTML(state.tasks.t1)).toContain('+11 pts'); // 3x2 + 5
    await toggleTask('t1', () => 'Al', admin);
    expect(state.members.Al.points).toBe(21);
  });
  it('other chores and other days get no extra', async () => {
    await toggleTask('t2', () => 'Al', admin);
    expect(state.members.Al.points).toBe(13);
    vi.setSystemTime(new Date('2026-05-14T09:00:00'));
    state.tasks.t1.lastDone = NOW - 9 * 86400000;
    await toggleTask('t1', () => 'Al', admin);
    expect(state.tasks.t1.lastDonePoints).toBe(3);
  });
});

describe('admin set / clear (AC1, AC4, AC5)', () => {
  it('admin sets it with one bounded node', async () => {
    state.bonusChore = null;
    expect(await setBonusChore('t2', 6, admin)).toBe(true);
    expect(patchRoot).toHaveBeenCalledWith({ bonusChore: { date: TODAY, taskId: 't2', extra: 6 } });
  });
  it('admin can clear it', async () => {
    expect(await clearBonusChore(admin)).toBe(true);
    expect(patchRoot).toHaveBeenCalledWith({ bonusChore: null });
    expect(state.bonusChore).toBeNull();
  });
  it('invalid input is refused without writing', async () => {
    expect(await setBonusChore('t2', 99, admin)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('a member cannot set or clear it', async () => {
    expect(await setBonusChore('t2', 6, notAdmin)).toBe(false);
    expect(await clearBonusChore(notAdmin)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(state.bonusChore.taskId).toBe('t1');
  });
  it('READONLY (TV) cannot set or clear it even for an admin', async () => {
    cfg.ro = true;
    expect(await setBonusChore('t2', 6, admin)).toBe(false);
    expect(await clearBonusChore(admin)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('admin form escapes chore names and shows Clear only while live', () => {
    state.tasks.t2.name = '<img src=x onerror=alert(1)>';
    const html = bonusChoreAdminHTML();
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('clearBonusChore');
    state.bonusChore = null;
    expect(bonusChoreAdminHTML()).not.toContain('clearBonusChore');
  });
});

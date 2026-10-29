import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

// #221 — fake DB: adjustMemberPoints applies the same week rules as the real transaction in src/firebase.js.
vi.mock('../src/firebase.js', () => ({
  adjustMemberPoints: vi.fn(async (name, { pts = 0, count = 0, weekStart, countWeek = true }) => {
    const cur = state.members[name];
    const next = { ...cur, points: (cur.points || 0) + pts, completedCount: Math.max(0, (cur.completedCount || 0) + count) };
    if (countWeek) {
      next.weekPoints = Math.max(0, (cur.weekStart === weekStart ? (cur.weekPoints || 0) : 0) + pts);
      next.weekStart = weekStart;
    }
    state.members[name] = next;
    return { ok: true, reason: '' };
  }),
  appendHistory: vi.fn(async e => { state.history = (state.history || []).concat([e]).slice(-500); return { ok: true }; }),
  removeHistoryEntry: vi.fn(async () => ({ ok: true, removed: true, rest: [] })),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { adjustBonus } from '../src/bonus.js';
import { currentWeekPoints, weekRecap, getWeekStart } from '../src/utils.js';

const admin = () => true;
const asDad = () => 'Dad';
const NOW = new Date('2026-05-13T12:00:00').getTime(); // Wednesday; week starts Mon 2026-05-11

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.members = {
    Alice: { name: 'Alice', role: 'member', points: 20, weekPoints: 10, weekStart: '2026-05-11' },
    Bob:   { name: 'Bob',   role: 'member', points: 20, weekPoints: 8,  weekStart: '2026-05-11' },
    Dad:   { name: 'Dad',   role: 'admin',  points: 0 },
  };
  state.history = [
    { taskId: 't1', taskName: 'Bins', person: 'Alice', completedAt: NOW - 3600000, points: 10 },
    { taskId: 't2', taskName: 'Dishes', person: 'Bob', completedAt: NOW - 3600000, points: 8 },
  ];
});
afterEach(() => vi.useRealTimers());

const recap = name => (weekRecap(state.history, getWeekStart()).find(r => r.name === name) || { points: 0 }).points;

describe('a deduction lowers This week the same as Last week (#221)', () => {
  it('This week matches the week recap after a −5 deduction', async () => {
    expect(await adjustBonus('Alice', -5, 'Broke a plate', admin, asDad)).toBe(true);
    expect(recap('Alice')).toBe(5);
    expect(currentWeekPoints(state.members.Alice)).toBe(5);
  });

  it('the member on top of This week is the one the recap crowns', async () => {
    await adjustBonus('Alice', -5, 'Broke a plate', admin, asDad);
    const top = Object.values(state.members).sort((a, b) => currentWeekPoints(b) - currentWeekPoints(a))[0].name;
    expect(top).toBe(weekRecap(state.history, getWeekStart())[0].name);
    expect(top).toBe('Bob');
  });

  it('week points never go below 0', async () => {
    await adjustBonus('Alice', -15, 'Big oops', admin, asDad);
    expect(state.members.Alice.weekPoints).toBe(0);
    expect(currentWeekPoints(state.members.Alice)).toBe(0);
  });
});

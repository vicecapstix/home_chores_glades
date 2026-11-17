import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { toggleTask } from '../src/tasks.js';
import { dueStatus } from '../src/utils.js';

// Fake in-memory "database": the mocked helpers apply writes to state the way the onValue listener would.
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined),
  patchTask: vi.fn(async (id, f) => { Object.assign(state.tasks[id], f); }),
  patchMember: vi.fn(async (n, f) => { Object.assign(state.members[n], f); }),
  patchRoot: vi.fn(async f => { Object.assign(state, f); }),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
  removeHistoryEntry: vi.fn(async m => {
    const h = state.history || []; let idx = -1;
    for (let i = h.length - 1; i >= 0; i--) if (h[i].completedAt === m.completedAt && (m.person === undefined || h[i].person === m.person) && (m.taskId === undefined || h[i].taskId === m.taskId) && (m.type === undefined || h[i].type === m.type)) { idx = i; break; }
    if (idx < 0) return { ok: false, removed: false, rest: h };
    state.history = h.filter((_, i) => i !== idx);
    return { ok: true, removed: true, rest: state.history };
  }),
  appendHistory: vi.fn(async e => { state.history = (state.history || []).concat([e]).slice(-500); return { ok: true }; }),
  adjustMemberPoints: vi.fn(async (n, o) => {
    const m = state.members[n];
    m.points += o.pts; m.completedCount = Math.max(0, m.completedCount + o.count);
    return { ok: true };
  }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));

const admin = () => true;
const DAY = 86400000;
const NOW = new Date('2026-05-13T12:00:00').getTime();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.members = { Alice: { name: 'Alice', role: 'member', points: 10, weekPoints: 0, weekStart: '2026-05-11',
    completedCount: 4, streak: 3, lastStreakDate: '2026-05-12', badges: [], pinHash: '' } };
  state.tasks = { t1: { id: 't1', name: 'Bins', freq: 'daily', difficulty: 'easy', done: false,
    lastDone: NOW - 3 * DAY, person: 'Alice', subtasks: {}, order: 1 } };
  state.history = [{ taskId: 'x', taskName: 'Other', person: 'Alice', completedAt: NOW - DAY, points: 1 }];
});
afterEach(() => vi.useRealTimers());

// #348: only real completions (no `type`) keep the streak on uncheck.
describe('uncheck streak ignores non-completion history rows (#348)', () => {
  const extras = {
    swap: { type: 'swap', taskId: 's1', taskName: 'Swap: Dishes', person: 'Alice', from: 'Bob', points: 0 },
    bonus: { type: 'bonus', taskName: 'Bonus: Helped', person: 'Alice', points: 5, reason: 'Helped', by: 'Mum' },
  };
  for (const kind of Object.keys(extras)) {
    it('restores streak 3 / yesterday after a same-day ' + kind + ' entry', async () => {
      state.history = state.history.concat([{ ...extras[kind], completedAt: NOW - 3600000 }]);
      await toggleTask('t1', () => 'Alice', admin);
      expect(state.members.Alice.streak).toBe(4);
      await toggleTask('t1', () => 'Alice', admin);
      expect(state.members.Alice.streak).toBe(3);
      expect(state.members.Alice.lastStreakDate).toBe('2026-05-12');
    });
  }

  it('still keeps the streak when a real second completion the same day exists', async () => {
    state.tasks.t2 = { id: 't2', name: 'Dishes', freq: 'daily', difficulty: 'easy', done: false, lastDone: NOW - 3 * DAY, person: 'Alice', subtasks: {}, order: 2 };
    await toggleTask('t1', () => 'Alice', admin);
    vi.setSystemTime(NOW + 1000);
    await toggleTask('t2', () => 'Alice', admin);
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.members.Alice.streak).toBe(4);
  });
});

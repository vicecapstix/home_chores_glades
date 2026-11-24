import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { toggleTask } from '../src/tasks.js';
import { computeResumePatch } from '../src/pause.js';
import { computeReturnPatch } from '../src/away.js';

// In-memory fake DB: helpers apply writes to state like the onValue listener would.
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined),
  patchTask: vi.fn(async (id, f) => { Object.assign(state.tasks[id], f); }),
  patchMember: vi.fn(async (n, f) => { Object.assign(state.members[n], f); }),
  patchRoot: vi.fn(async f => { Object.assign(state, f); }),
  patchPaths: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
  removeHistoryEntry: vi.fn(async m => {
    const h = state.history || []; let idx = -1;
    for (let i = h.length - 1; i >= 0; i--) if (h[i].completedAt === m.completedAt && (m.person === undefined || h[i].person === m.person) && (m.taskId === undefined || h[i].taskId === m.taskId) && (m.type === undefined || h[i].type === m.type)) { idx = i; break; }
    if (idx < 0) return { ok: false, removed: false, rest: h };
    state.history = h.filter((_, i) => i !== idx);
    return { ok: true, removed: true, rest: state.history };
  }),
  appendHistory: vi.fn(async e => { state.history = (state.history || []).concat([e]); return { ok: true }; }),
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
const MON = new Date('2026-05-11T09:00:00').getTime();

function applyPatch(patch) {
  Object.entries(patch).forEach(([k, v]) => {
    const [kind, id, field] = k.split('/');
    if (kind === 'tasks') state.tasks[id][field] = v;
  });
}

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(MON);
  state.pause = null;
  state.members = { Al: { name: 'Al', role: 'member', points: 10, weekPoints: 0, weekStart: '2026-05-11',
    completedCount: 4, streak: 3, lastStreakDate: '2026-05-10', badges: [], pinHash: '' } };
  state.tasks = { t1: { id: 't1', name: 'Bins', freq: 'weekly', difficulty: 'easy', done: false,
    lastDone: MON - 8 * DAY, person: 'Al', subtasks: {}, order: 1 } };
  state.history = [];
});
afterEach(() => vi.useRealTimers());

describe('uncheck after a pause or away shift (#389)', () => {
  it('pause: removes the history entry and restores points, count and streak', async () => {
    await toggleTask('t1', () => 'Al', admin);
    expect(state.history).toHaveLength(1);
    const pts = state.members.Al.points;
    expect(pts).toBeGreaterThan(10);
    const pause = { since: MON + DAY, until: '2026-05-14', by: 'Al' };
    const patch = computeResumePatch(pause, state.tasks, state.members, MON + 4 * DAY);
    // the done chore was ticked before the pause, so its lastDone is shifted (reset freeze)
    expect(patch['tasks/t1/lastDone']).toBeGreaterThan(MON);
    applyPatch(patch);
    vi.setSystemTime(MON + 4 * DAY);
    await toggleTask('t1', () => 'Al', admin);
    expect(state.tasks.t1.done).toBe(false);
    expect(state.history).toHaveLength(0);
    expect(state.members.Al.points).toBe(10);
    expect(state.members.Al.completedCount).toBe(4);
    expect(state.members.Al.streak).toBe(3);
  });

  it('away: removes the history entry after the member returns', async () => {
    await toggleTask('t1', () => 'Al', admin);
    const member = { ...state.members.Al, awaySince: MON + DAY };
    const patch = computeReturnPatch(member, state.tasks, MON + 4 * DAY);
    expect(patch['tasks/t1/lastDone']).toBeGreaterThan(MON);
    applyPatch(patch);
    vi.setSystemTime(MON + 4 * DAY);
    await toggleTask('t1', () => 'Al', admin);
    expect(state.history).toHaveLength(0);
    expect(state.members.Al.points).toBe(10);
  });

  it('keeps the reset freeze: the shifted lastDone is left alone', async () => {
    await toggleTask('t1', () => 'Al', admin);
    const patch = computeResumePatch({ since: MON + DAY }, state.tasks, state.members, MON + 4 * DAY);
    applyPatch(patch);
    expect(state.tasks.t1.lastDone).toBe(MON + 3 * DAY);
    expect(state.tasks.t1.lastDoneAt).toBe(MON);
  });

  it('a chore ticked after the pause is unaffected and uncheck removes its row', async () => {
    vi.setSystemTime(MON + 5 * DAY);
    await toggleTask('t1', () => 'Al', admin);
    const patch = computeResumePatch({ since: MON + DAY }, state.tasks, state.members, MON + 4 * DAY);
    expect(patch['tasks/t1/lastDone']).toBeUndefined();
    await toggleTask('t1', () => 'Al', admin);
    expect(state.history).toHaveLength(0);
    expect(state.tasks.t1.lastDoneAt).toBeNull();
  });
});

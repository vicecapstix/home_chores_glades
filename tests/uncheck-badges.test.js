import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { toggleTask } from '../src/tasks.js';

// Fake in-memory "database" (same mock as uncheck-restore.test.js): writes apply to state like the onValue listener.
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

const member = extra => ({ name: 'Alice', role: 'member', points: 50, weekPoints: 0, weekStart: '2026-05-11',
  completedCount: 9, streak: 1, lastStreakDate: '2026-05-12', badges: ['first'], pinHash: '', ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.tasks = { t1: { id: 't1', name: 'Bins', freq: 'daily', difficulty: 'easy', done: false,
    lastDone: NOW - 3 * DAY, person: 'Alice', subtasks: {}, order: 1 } };
  state.history = [];
});
afterEach(() => vi.useRealTimers());

describe('uncheck takes back badges the check earned (#220)', () => {
  it('removes the 10-completion badge when the 10th completion is unticked', async () => {
    state.members = { Alice: member() };
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.members.Alice.badges).toEqual(['first', 'getting_started']);
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.members.Alice.completedCount).toBe(9);
    expect(state.members.Alice.badges).toEqual(['first']);
  });

  it('removes a streak badge when the day that reached the streak is unticked', async () => {
    state.members = { Alice: member({ completedCount: 4, streak: 2 }) };
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.members.Alice.badges).toContain('consistent');
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.members.Alice.streak).toBe(2);
    expect(state.members.Alice.badges).toEqual(['first']);
  });

  it('keeps badges earned earlier for other reasons', async () => {
    const earned = ['first', 'getting_started', 'tenacious', 'consistent', 'on_fire'];
    state.members = { Alice: member({ completedCount: 30, streak: 0, lastStreakDate: '2026-04-01', badges: [...earned] }) };
    await toggleTask('t1', () => 'Alice', admin);
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.members.Alice.badges).toEqual(earned);
  });
});

describe('uncheck only takes back badges that tick awarded (#220 review)', () => {
  it('keeps a badge held from earlier when a tick re-reaches its threshold and is unticked', async () => {
    state.members = { Alice: member({ completedCount: 40, streak: 2, badges: ['first', 'getting_started', 'tenacious', 'consistent'] }) };
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.members.Alice.streak).toBe(3);
    expect(state.tasks.t1.lastDoneBadges ?? null).toBeNull();
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.members.Alice.streak).toBe(2);
    expect(state.members.Alice.badges).toContain('consistent');
  });

  it('records the awarded badges on the task and clears them on uncheck', async () => {
    state.members = { Alice: member() };
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.tasks.t1.lastDoneBadges).toEqual(['getting_started']);
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.tasks.t1.lastDoneBadges ?? null).toBeNull();
  });

  it('keeps a badge another device added between the check and the uncheck', async () => {
    state.members = { Alice: member() };
    await toggleTask('t1', () => 'Alice', admin);
    state.members.Alice.badges = [...state.members.Alice.badges, 'consistent'];
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.members.Alice.badges).toEqual(['first', 'consistent']);
  });

  it('a member unticking their own chore loses the badge too', async () => {
    state.members = { Alice: member() };
    await toggleTask('t1', () => 'Alice', admin);
    await toggleTask('t1', () => 'Alice', () => false);
    expect(state.members.Alice.badges).toEqual(['first']);
  });
});

describe('a stale lastDoneBadges from an earlier cycle is not reused (#220 review)', () => {
  it('a tick that earns nothing overwrites it, so the untick keeps the old badge', async () => {
    // Holds Consistent from earlier; streak 2 → tick (3, nothing new) → untick (back to 2).
    state.members = { Alice: member({ completedCount: 15, streak: 2, badges: ['first', 'getting_started', 'consistent'] }) };
    state.tasks.t1.lastDoneBadges = ['consistent']; // left from a check before the chore reset
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.tasks.t1.lastDoneBadges).toBeNull();
    await toggleTask('t1', () => 'Alice', admin);
    expect(state.members.Alice.streak).toBe(2);
    expect(state.members.Alice.badges).toEqual(['first', 'getting_started', 'consistent']);
  });
});

describe('badge take-back failure is reported (#220 review)', () => {
  it('shows a toast when the badge write fails', async () => {
    const fb = await import('../src/firebase.js');
    const { showToast } = await import('../src/ui.js');
    state.members = { Alice: member() };
    await toggleTask('t1', () => 'Alice', admin);
    const real = fb.patchMember.getMockImplementation();
    fb.patchMember.mockImplementation(async (n, f) => { if ('badges' in f) throw new Error('offline'); return real(n, f); });
    try {
      await toggleTask('t1', () => 'Alice', admin);
      expect(showToast).toHaveBeenCalledWith('Member update failed: offline');
    } finally { fb.patchMember.mockImplementation(real); }
  });
});

describe('a recorded badge still earned after the untick is kept (#220, JT option B)', () => {
  it('keeps the 10-completion badge when a later chore still holds the count at 10', async () => {
    state.members = { Alice: member() };
    state.tasks.t2 = { id: 't2', name: 'Dishes', freq: 'daily', difficulty: 'easy', done: false,
      lastDone: NOW - 3 * DAY, person: 'Alice', subtasks: {}, order: 2 };
    await toggleTask('t1', () => 'Alice', admin); // 10th → getting_started
    await toggleTask('t2', () => 'Alice', admin); // 11th
    await toggleTask('t1', () => 'Alice', admin); // back to 10
    expect(state.members.Alice.completedCount).toBe(10);
    expect(state.members.Alice.badges).toContain('getting_started');
  });
});

describe('streak left as is when another chore was done the same day (#220 review)', () => {
  it('keeps Consistent when one of two same-day chores is unticked', async () => {
    state.members = { Alice: member({ completedCount: 4, streak: 2 }) };
    state.tasks.t2 = { id: 't2', name: 'Dishes', freq: 'daily', difficulty: 'easy', done: false,
      lastDone: NOW - 3 * DAY, person: 'Alice', subtasks: {}, order: 2 };
    await toggleTask('t1', () => 'Alice', admin); // streak 2 → 3, earns Consistent
    expect(state.members.Alice.badges).toContain('consistent');
    await toggleTask('t2', () => 'Alice', admin); // same day: streak stays 3
    await toggleTask('t1', () => 'Alice', admin); // untick: t2 still done today
    expect(state.members.Alice.streak).toBe(3);
    expect(state.members.Alice.badges).toContain('consistent');
  });
});

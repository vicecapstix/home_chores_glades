import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../src/state.js';
import { choreStreak, streakTag } from '../src/chorestreak.js';

// Wed 25 Nov 2026, noon local.
const NOW = new Date(2026, 10, 25, 12).getTime();
const ago = d => new Date(2026, 10, 25 - d, 9).getTime();
const days = (...n) => n.map(ago);

beforeEach(() => { state.history = []; });

describe('choreStreak: periods in a row (#361)', () => {
  it('daily: 4 consecutive days including today = 4', () => {
    expect(choreStreak({ freq: 'daily' }, days(0, 1, 2, 3), NOW)).toBe(4);
  });
  it('daily: today not done yet does not break it', () => {
    expect(choreStreak({ freq: 'daily' }, days(1, 2, 3), NOW)).toBe(3);
  });
  it('daily: a missed day ends the run (only the latest run counts)', () => {
    expect(choreStreak({ freq: 'daily' }, days(0, 1, 3, 4, 5), NOW)).toBe(2);
  });
  it('daily: last done 2 days ago = broken = 0', () => {
    expect(choreStreak({ freq: 'daily' }, days(2, 3, 4), NOW)).toBe(0);
  });
  it('several completions in one period count once', () => {
    expect(choreStreak({ freq: 'daily' }, [ago(0), ago(0) + 1000, ago(1)], NOW)).toBe(2);
  });
  it('weekly: 4 weeks in a row, then a gap week', () => {
    expect(choreStreak({ freq: 'weekly' }, days(0, 7, 14, 21), NOW)).toBe(4);
    expect(choreStreak({ freq: 'weekly' }, days(0, 7, 21, 28), NOW)).toBe(2);
  });
  it('fortnightly and every-N-days chores count their own periods', () => {
    expect(choreStreak({ freq: 'fortnightly' }, days(0, 14, 28), NOW)).toBe(3);
    expect(choreStreak({ freq: 'interval', intervalDays: 3 }, days(0, 3, 6, 9), NOW)).toBe(4);
  });
  it('monthly: consecutive calendar months', () => {
    const m = [new Date(2026, 10, 3), new Date(2026, 9, 28), new Date(2026, 8, 5)].map(d => d.getTime());
    expect(choreStreak({ freq: 'monthly' }, m, NOW)).toBe(3);
  });
  it('weekdays: a weekend is not a miss, an unticked scheduled day is', () => {
    const t = { freq: 'weekdays', days: [1, 2, 3, 4, 5] };
    // Wed 25, Tue 24, Mon 23, Fri 20 (weekend between) = 4
    expect(choreStreak(t, days(0, 1, 2, 5), NOW)).toBe(4);
    // Thu 19 skipped: Fri 20 / Wed 18 are separate runs
    expect(choreStreak(t, days(0, 1, 2, 5, 7), NOW)).toBe(4);
    expect(choreStreak(t, days(0, 2, 3), NOW)).toBe(1); // Tue 24 missed
  });
  it('one-off chores and every-N-weeks weekdays chores never get a streak', () => {
    expect(choreStreak({ freq: 'once' }, days(0, 1, 2, 3), NOW)).toBe(0);
    expect(choreStreak({ freq: 'weekdays', days: [3], everyWeeks: 2 }, days(0, 7, 14), NOW)).toBe(0);
  });
  it('empty or missing history = 0', () => {
    expect(choreStreak({ freq: 'daily' }, [], NOW)).toBe(0);
    expect(choreStreak({ freq: 'daily' }, undefined, NOW)).toBe(0);
  });
});

describe('streakTag: shown only for N >= 3, from history completions only', () => {
  const t = { id: 't1', freq: 'daily', name: 'Bins' };
  it('shows "🔁 N in a row" with a tooltip about the 500-entry cap', () => {
    state.history = days(0, 1, 2, 3).map(c => ({ taskId: 't1', person: 'Amy', completedAt: c, points: 1 }));
    const html = streakTag(t, NOW);
    expect(html).toContain('🔁 4 in a row');
    expect(html).toContain('500 history entries');
  });
  it('hidden at 2', () => {
    state.history = days(0, 1).map(c => ({ taskId: 't1', person: 'Amy', completedAt: c }));
    expect(streakTag(t, NOW)).toBe('');
  });
  it('ignores bonus/swap rows and other chores', () => {
    state.history = [
      ...days(0, 1).map(c => ({ taskId: 't1', completedAt: c })),
      { type: 'swap', taskId: 't1', completedAt: ago(2) },
      { type: 'bonus', taskName: 'Bonus: x', completedAt: ago(3) },
      { taskId: 't2', completedAt: ago(2) },
    ];
    expect(streakTag(t, NOW)).toBe('');
  });
  it('picks up history changes (cache keyed on the array)', () => {
    state.history = days(0, 1).map(c => ({ taskId: 't1', completedAt: c }));
    expect(streakTag(t, NOW)).toBe('');
    state.history = days(0, 1, 2).map(c => ({ taskId: 't1', completedAt: c }));
    expect(streakTag(t, NOW)).toContain('3 in a row');
    state.history.push({ taskId: 't1', completedAt: ago(3) });
    expect(streakTag(t, NOW)).toContain('4 in a row');
  });
  it('hidden for a one-off chore', () => {
    state.history = days(0, 1, 2, 3).map(c => ({ taskId: 't1', completedAt: c }));
    expect(streakTag({ ...t, freq: 'once' }, NOW)).toBe('');
  });
});

describe('streak on the card (also the TV, which uses cardHTML)', () => {
  it('cardHTML includes the tag for a recurring chore', async () => {
    vi.useFakeTimers(); vi.setSystemTime(NOW);
    const { cardHTML } = await import('../src/render.js');
    state.members = { Amy: { name: 'Amy', role: 'member' } };
    state.history = days(0, 1, 2).map(c => ({ taskId: 't1', person: 'Amy', completedAt: c, points: 1 }));
    const html = cardHTML({ id: 't1', name: 'Bins', freq: 'daily', person: 'Amy', done: true, lastDone: ago(0), difficulty: 'easy' });
    expect(html).toContain('🔁 3 in a row');
    vi.useRealTimers();
  });
});

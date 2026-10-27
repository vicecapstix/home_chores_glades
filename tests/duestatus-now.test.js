// #171: dueStatus(t, now) must evaluate against `now`, not the system clock,
// for one-off and specific-day chores too.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dueStatus, todayProgress } from '../src/utils.js';

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime();

describe('dueStatus honours its now argument (#171)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(at(2026, 5, 13))); }); // system clock: Wed 13 May 2026
  afterEach(() => { vi.useRealTimers(); });

  it('one-off due in two days is ok now, but soon when evaluated the day before', () => {
    const t = { freq: 'once', dueDate: '2026-05-15', done: false };
    expect(dueStatus(t)).toBe('ok');
    expect(dueStatus(t, at(2026, 5, 14))).toBe('soon');
    expect(dueStatus(t, at(2026, 5, 15))).toBe('soon');
    expect(dueStatus(t, at(2026, 5, 16))).toBe('overdue');
  });

  it('one-off due tomorrow evaluated with a now of the day before yesterday is ok', () => {
    const t = { freq: 'once', dueDate: '2026-05-14', done: false };
    expect(dueStatus(t)).toBe('soon');
    expect(dueStatus(t, at(2026, 5, 11))).toBe('ok');
  });

  it('specific-day chore uses now, not the system clock', () => {
    // Fridays only (5). Last done Fri 8 May.
    const t = { freq: 'weekdays', days: [5], done: false, lastDone: at(2026, 5, 8, 9) };
    expect(dueStatus(t)).toBe('ok');                       // Wed 13: last Friday was done
    expect(dueStatus(t, at(2026, 5, 15))).toBe('soon');    // Fri 15: due today
    expect(dueStatus(t, at(2026, 5, 16))).toBe('overdue'); // Sat 16: Friday missed
  });

  it('same answers whatever the system clock says', () => {
    const once = { freq: 'once', dueDate: '2026-05-15', done: false };
    const wk = { freq: 'weekdays', days: [5], done: false, lastDone: at(2026, 5, 8, 9) };
    const now = at(2026, 5, 16);
    expect([dueStatus(once, now), dueStatus(wk, now)]).toEqual(['overdue', 'overdue']);
    vi.setSystemTime(new Date(at(2026, 1, 1)));
    expect([dueStatus(once, now), dueStatus(wk, now)]).toEqual(['overdue', 'overdue']);
  });

  it('todayProgress(tasks, now) counts a one-off that is overdue at that time', () => {
    const t = { freq: 'once', dueDate: '2026-05-20', done: false };
    expect(todayProgress([t]).total).toBe(0);
    expect(todayProgress([t], at(2026, 5, 22)).total).toBe(1);
  });
});

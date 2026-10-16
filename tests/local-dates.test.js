import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import * as U from '../src/utils.js';
import { tvStripHTML } from '../src/tv.js';

const OLD_TZ = process.env.TZ;
beforeAll(() => { process.env.TZ = 'Asia/Singapore'; });
afterAll(() => { process.env.TZ = OLD_TZ; });
afterEach(() => vi.useRealTimers());

// Monday 2026-05-11 07:00 in Singapore (UTC+8) = Sunday 2026-05-10 23:00 UTC
const MON_0700_SGT = new Date('2026-05-10T23:00:00.000Z');

describe('local dates (#33)', () => {
  it('localDateStr uses the local calendar day', () => {
    vi.useFakeTimers(); vi.setSystemTime(MON_0700_SGT);
    expect(typeof U.localDateStr).toBe('function');
    expect(U.localDateStr()).toBe('2026-05-11');
  });
  it('getWeekStart is the local Monday (not last week) at Monday 07:00 SGT', () => {
    vi.useFakeTimers(); vi.setSystemTime(MON_0700_SGT);
    expect(U.getWeekStart()).toBe('2026-05-11');
  });
  it('one-off task due today is soon, due yesterday is overdue (local days)', () => {
    vi.useFakeTimers(); vi.setSystemTime(MON_0700_SGT);
    expect(U.dueStatus({ freq: 'once', dueDate: '2026-05-11', done: false })).toBe('soon');
    expect(U.dueStatus({ freq: 'once', dueDate: '2026-05-10', done: false })).toBe('overdue');
    expect(U.dueStatus({ freq: 'once', dueDate: '2026-05-13', done: false })).toBe('ok');
  });
  it('currentWeekPoints ignores last week\'s points', () => {
    vi.useFakeTimers(); vi.setSystemTime(MON_0700_SGT);
    expect(U.currentWeekPoints({ weekPoints: 9, weekStart: '2026-05-04' })).toBe(0);
    expect(U.currentWeekPoints({ weekPoints: 9, weekStart: '2026-05-11' })).toBe(9);
    expect(U.currentWeekPoints({ weekPoints: 9 })).toBe(0);
  });
  it('TV strip shows 0 and orders by this week only', () => {
    vi.useFakeTimers(); vi.setSystemTime(MON_0700_SGT);
    const html = tvStripHTML({
      Old: { name: 'Old', weekPoints: 50, weekStart: '2026-05-04' },
      New: { name: 'New', weekPoints: 3, weekStart: '2026-05-11' },
    });
    expect(html.indexOf('New')).toBeLessThan(html.indexOf('Old'));
    expect(html).not.toContain('<b>50</b>');
  });
});

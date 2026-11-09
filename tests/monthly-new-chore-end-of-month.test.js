import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dueStatus, initialLastDone, addMonthClamped, localDateStr } from '../src/utils.js';

const L = (y, m, d, h = 10) => new Date(y, m - 1, d, h).getTime();
const fresh = now => ({ id: 'a', name: 'A', freq: 'monthly', done: false, lastDone: initialLastDone('monthly', now) });
const OLD_TZ = process.env.TZ;
beforeAll(() => { process.env.TZ = 'America/New_York'; });
afterAll(() => { process.env.TZ = OLD_TZ; });

describe('new monthly chore is never overdue on the day it is created (#307)', () => {
  it.each([
    ['31 Oct', L(2026, 10, 31)],
    ['31 Mar (via Feb)', L(2026, 3, 31)],
    ['30 Mar', L(2026, 3, 30)],
    ['29 Mar', L(2026, 3, 29)],
    ['31 May', L(2026, 5, 31)],
    ['29 Feb 2028', L(2028, 2, 29)],
  ])('created on %s', (_n, now) => {
    expect(dueStatus(fresh(now), now)).not.toBe('overdue');
  });
  it('created on 15 Oct is still due that day', () => {
    const now = L(2026, 10, 15);
    expect(localDateStr(new Date(initialLastDone('monthly', now)))).toBe('2026-09-15');
    expect(dueStatus(fresh(now), now)).toBe('soon');
  });
  it('after the first tick the next due day follows the calendar-month rule', () => {
    const now = L(2026, 10, 31);
    expect(localDateStr(addMonthClamped(new Date(now), 1))).toBe('2026-11-30');
  });
});

import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { lateLabel, daysLate, setPauseUntil, setAwayMembers } from '../src/utils.js';

const origTZ = process.env.TZ;
process.env.TZ = 'Europe/London'; // set before NOW is computed
afterAll(() => { if (origTZ === undefined) delete process.env.TZ; else process.env.TZ = origTZ; });
afterEach(() => { setPauseUntil(''); setAwayMembers({}); });

const at = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const NOW = at(2026, 6, 10); // Wed 10 Jun 2026

describe('lateLabel (#402)', () => {
  it('daily chore: 1 day late, then N days late', () => {
    expect(lateLabel({ freq: 'daily', lastDone: at(2026, 6, 8, 23, 59) }, NOW)).toBe('1 day late');
    expect(lateLabel({ freq: 'daily', lastDone: at(2026, 6, 6, 0, 1) }, NOW)).toBe('3 days late');
  });
  it('not overdue gives no label', () => {
    expect(lateLabel({ freq: 'daily', lastDone: at(2026, 6, 9) }, NOW)).toBe('');
    expect(lateLabel({ freq: 'daily', done: true, lastDone: at(2026, 6, 1) }, NOW)).toBe('');
    expect(lateLabel(null, NOW)).toBe('');
  });
  it('weekly chore counts local days past the due day', () => {
    expect(lateLabel({ freq: 'weekly', lastDone: at(2026, 6, 2) }, NOW)).toBe('1 day late');
    expect(lateLabel({ freq: 'weekly', lastDone: at(2026, 5, 30) }, NOW)).toBe('4 days late');
  });
  it('interval chore uses intervalDays', () => {
    expect(lateLabel({ freq: 'interval', intervalDays: 3, lastDone: at(2026, 6, 5) }, NOW)).toBe('2 days late');
  });
  it('one-off chore counts from its due date', () => {
    expect(lateLabel({ freq: 'once', dueDate: '2026-06-09' }, NOW)).toBe('1 day late');
    expect(lateLabel({ freq: 'once', dueDate: '2026-06-03' }, NOW)).toBe('7 days late');
    expect(lateLabel({ freq: 'once', dueDate: '2026-06-10' }, NOW)).toBe('');
  });
  it("'Due today' when overdue by dueTime on its due day", () => {
    expect(lateLabel({ freq: 'once', dueDate: '2026-06-10', dueTime: '09:00' }, NOW)).toBe('Due today');
    expect(lateLabel({ freq: 'weekly', lastDone: at(2026, 6, 3), dueTime: '08:00' }, NOW)).toBe('Due today');
    expect(lateLabel({ freq: 'weekdays', days: [3], lastDone: at(2026, 6, 3), dueTime: '08:00' }, NOW)).toBe('Due today');
  });
  it('weekdays chore counts from the missed scheduled day', () => {
    expect(lateLabel({ freq: 'weekdays', days: [1], lastDone: at(2026, 6, 1) }, NOW)).toBe('2 days late'); // Mon 8 Jun
    expect(lateLabel({ freq: 'weekdays', days: [1, 3], lastDone: at(2026, 6, 5) }, NOW)).toBe('');
  });
  it('is DST-safe across the spring-forward and fall-back weeks', () => {
    const spring = at(2026, 3, 30, 12);
    expect(daysLate({ freq: 'weekly', lastDone: at(2026, 3, 22, 23, 30) }, spring)).toBe(1);
    expect(lateLabel({ freq: 'daily', lastDone: at(2026, 3, 28, 23, 30) }, spring)).toBe('1 day late');
    expect(lateLabel({ freq: 'once', dueDate: '2026-03-28' }, spring)).toBe('2 days late');
    const fall = at(2026, 10, 26, 0, 30);
    expect(lateLabel({ freq: 'daily', lastDone: at(2026, 10, 24, 0, 10) }, fall)).toBe('1 day late');
    expect(lateLabel({ freq: 'once', dueDate: '2026-10-24' }, fall)).toBe('2 days late');
    expect(lateLabel({ freq: 'weekdays', days: [6], lastDone: at(2026, 10, 17) }, fall)).toBe('2 days late');
  });
  it('is excluded while the house is paused', () => {
    setPauseUntil('2026-06-12');
    expect(lateLabel({ freq: 'once', dueDate: '2026-06-01' }, NOW)).toBe('');
  });
  it('is excluded while the assignee is away', () => {
    setAwayMembers({ Amy: { name: 'Amy', awayUntil: '2026-06-11' } });
    expect(lateLabel({ freq: 'once', dueDate: '2026-06-01', person: 'Amy' }, NOW)).toBe('');
    expect(lateLabel({ freq: 'once', dueDate: '2026-06-01', person: 'Ben' }, NOW)).toBe('9 days late');
  });
  it('is excluded while the chore is switched off, skipped or waiting for a check', () => {
    expect(lateLabel({ freq: 'once', dueDate: '2026-06-01', offUntil: '2026-06-20' }, NOW)).toBe('');
    expect(lateLabel({ freq: 'daily', skippedAt: at(2026, 6, 9) , lastDone: at(2026, 6, 9) }, NOW)).toBe('');
    expect(lateLabel({ freq: 'once', dueDate: '2026-06-01', checkPending: { by: 'Amy', at: 1 } }, NOW)).toBe('');
  });
});

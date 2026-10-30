// #222: recurring chores are 'Due soon' on their due day and 'Overdue' only from the next day.
// Dates are fixed (no real clock). Firebase is not involved.
import { describe, it, expect } from 'vitest';
import { dueStatus, todayProgress } from '../src/utils.js';
import { selectNotifyTasks } from '../src/notifications.js';

const at = (y, m, d, h = 10) => new Date(y, m - 1, d, h, 0, 0).getTime();
const chore = (over) => ({ id: 'a', name: 'Dishes', freq: 'daily', done: false, lastDone: at(2026, 5, 12, 9), person: 'Ann', ...over });

describe('recurring chores are due today, overdue from tomorrow (#222)', () => {
  it('daily chore done yesterday is soon today and overdue tomorrow', () => {
    expect(dueStatus(chore(), at(2026, 5, 13, 0))).toBe('soon');
    expect(dueStatus(chore(), at(2026, 5, 13, 23))).toBe('soon');
    expect(dueStatus(chore(), at(2026, 5, 14, 0))).toBe('overdue');
  });
  it('weekly chore: soon on the 7th day, overdue on the 8th', () => {
    const t = chore({ freq: 'weekly' });
    expect(dueStatus(t, at(2026, 5, 19))).toBe('soon');
    expect(dueStatus(t, at(2026, 5, 20))).toBe('overdue');
  });
  it('fortnightly and interval chores follow the same rule', () => {
    expect(dueStatus(chore({ freq: 'fortnightly' }), at(2026, 5, 26))).toBe('soon');
    expect(dueStatus(chore({ freq: 'fortnightly' }), at(2026, 5, 27))).toBe('overdue');
    const i = chore({ freq: 'interval', intervalDays: 3 });
    expect(dueStatus(i, at(2026, 5, 15))).toBe('soon');
    expect(dueStatus(i, at(2026, 5, 16))).toBe('overdue');
  });
  it('monthly chore follows the calendar month', () => {
    const t = chore({ freq: 'monthly', lastDone: at(2026, 1, 15) });
    expect(dueStatus(t, at(2026, 2, 15))).toBe('soon');
    expect(dueStatus(t, at(2026, 2, 16))).toBe('overdue');
  });
  it('a due time still decides the moment it turns overdue', () => {
    const t = chore({ dueTime: '18:00' });
    expect(dueStatus(t, at(2026, 5, 13, 12))).toBe('soon');
    expect(dueStatus(t, at(2026, 5, 13, 19))).toBe('overdue');
  });
  it('the day before the due day is still soon, two days before is ok', () => {
    const t = chore({ freq: 'weekly' });
    expect(dueStatus(t, at(2026, 5, 18))).toBe('soon');
    expect(dueStatus(t, at(2026, 5, 17))).toBe('ok');
  });
  it('notifications leave a chore due today alone and include it the next day', () => {
    const tasks = { a: chore() };
    const real = Date.now;
    try {
      Date.now = () => at(2026, 5, 13, 8);
      expect(selectNotifyTasks(tasks, 'Ann')).toHaveLength(0);
      Date.now = () => at(2026, 5, 14, 8);
      expect(selectNotifyTasks(tasks, 'Ann')).toHaveLength(1);
    } finally { Date.now = real; }
  });
  it("today's goal still counts a chore that is due today", () => {
    expect(todayProgress([chore()], at(2026, 5, 13, 8))).toEqual({ done: 0, total: 1 });
    expect(todayProgress([chore({ freq: 'weekly' })], at(2026, 5, 17, 8))).toEqual({ done: 0, total: 0 });
  });
});

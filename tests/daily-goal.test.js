import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { todayProgress, localDateStr, setPauseUntil } from '../src/utils.js';
import { shouldCelebrate, markCelebrated, renderGoal, _resetGoal } from '../src/goal.js';

const NOW = new Date(2026, 9, 14, 12, 0).getTime(); // Wednesday
const today = localDateStr(new Date(NOW));
const old = NOW - 20 * 86400000;

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  localStorage.clear(); _resetGoal();
  document.body.innerHTML = '<div id="goal" class="hidden" role="progressbar"><span id="goal-text"></span><div id="goal-fill"></div></div><div id="toast" role="status"></div>';
});
afterEach(() => vi.useRealTimers());

describe('todayProgress', () => {
  it('counts weekday tasks scheduled today', () => {
    const tasks = [
      { id: 'a', freq: 'weekdays', days: [3], lastDone: old, done: false },
      { id: 'b', freq: 'weekdays', days: [3], lastDone: NOW - 1000, done: true },
      { id: 'c', freq: 'weekdays', days: [5], lastDone: NOW - 1000, done: false },
    ];
    expect(todayProgress(tasks, NOW)).toEqual({ done: 1, total: 2 });
  });
  it('counts once tasks by dueDate', () => {
    const tasks = [
      { id: 'a', freq: 'once', dueDate: today, done: false },
      { id: 'b', freq: 'once', dueDate: '2026-12-31', done: false },
      { id: 'c', freq: 'once', dueDate: '2026-10-01', done: false },
    ];
    expect(todayProgress(tasks, NOW)).toEqual({ done: 0, total: 2 });
  });
  it('counts overdue, ignores done-yesterday and skipped', () => {
    const tasks = [
      { id: 'a', freq: 'daily', lastDone: old, done: false },
      { id: 'b', freq: 'daily', lastDone: NOW - 2 * 86400000, done: true },
      { id: 'c', freq: 'daily', lastDone: old, skippedAt: old, done: false },
    ];
    expect(todayProgress(tasks, NOW)).toEqual({ done: 0, total: 1 });
  });
  it('counts a recurring chore due later today (dueTime) but not one due tomorrow (#161)', () => {
    const yest = new Date(2026, 9, 13, 10, 0).getTime();
    const tasks = [
      { id: 'a', freq: 'daily', dueTime: '19:00', lastDone: yest, done: false },
      { id: 'b', freq: 'daily', dueTime: '19:00', lastDone: yest, done: false },
      { id: 'c', freq: 'daily', dueTime: '19:00', lastDone: yest, done: true, lastDoneBy: 'x' },
      { id: 'd', freq: 'weekly', dueTime: '19:00', lastDone: new Date(2026, 9, 8, 10, 0).getTime(), done: false },
    ];
    tasks[2].lastDone = NOW - 1000;
    expect(todayProgress(tasks, NOW)).toEqual({ done: 1, total: 3 });
  });
  it('dueTime chore: skipped and paused behaviour unchanged (#161)', () => {
    const yest = new Date(2026, 9, 13, 10, 0).getTime();
    expect(todayProgress([{ id: 'a', freq: 'daily', dueTime: '19:00', lastDone: yest, skippedAt: yest, done: false }], NOW)).toEqual({ done: 0, total: 0 });
    setPauseUntil('2026-12-31');
    expect(todayProgress([{ id: 'a', freq: 'daily', dueTime: '19:00', lastDone: yest, done: false }], NOW)).toEqual({ done: 0, total: 0 });
    setPauseUntil('');
  });
  it('is zero when nothing is due', () => {
    expect(todayProgress([{ id: 'a', freq: 'weekly', lastDone: NOW, done: false }], NOW)).toEqual({ done: 0, total: 0 });
    expect(todayProgress([], NOW)).toEqual({ done: 0, total: 0 });
  });
});

describe('once-per-day flag', () => {
  it('celebrates once per day per device', () => {
    expect(shouldCelebrate(NOW)).toBe(true);
    markCelebrated(NOW);
    expect(shouldCelebrate(NOW)).toBe(false);
    expect(shouldCelebrate(NOW + 86400000)).toBe(true);
  });
  it('survives broken storage', () => {
    const s = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x'); });
    expect(shouldCelebrate(NOW)).toBe(true);
    s.mockRestore();
  });
});

describe('renderGoal', () => {
  const mk = done => [
    { id: 'a', freq: 'once', dueDate: today, done, lastDone: NOW },
    { id: 'b', freq: 'once', dueDate: today, done: true, lastDone: NOW },
  ];
  it('sets progressbar aria and hides when empty', () => {
    renderGoal(mk(false), NOW);
    const el = document.getElementById('goal');
    expect(el.classList.contains('hidden')).toBe(false);
    expect(el.getAttribute('aria-valuenow')).toBe('1');
    expect(el.getAttribute('aria-valuemax')).toBe('2');
    expect(document.getElementById('goal-text').textContent).toBe('Today: 1 of 2 chores done');
    renderGoal([], NOW);
    expect(el.classList.contains('hidden')).toBe(true);
  });
  it('celebrates once on the transition to complete', () => {
    const el = document.getElementById('goal');
    renderGoal(mk(true), NOW); // loaded already complete: no celebration
    expect(el.classList.contains('celebrate')).toBe(false);
    renderGoal(mk(false), NOW);
    renderGoal(mk(true), NOW);
    expect(el.classList.contains('celebrate')).toBe(true);
    expect(document.getElementById('toast').textContent).toMatch(/done/i);
    el.classList.remove('celebrate');
    renderGoal(mk(false), NOW);
    renderGoal(mk(true), NOW);
    expect(el.classList.contains('celebrate')).toBe(false);
  });
});

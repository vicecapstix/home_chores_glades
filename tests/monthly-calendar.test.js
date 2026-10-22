import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { checkTaskResets } from '../src/tasks.js';
import { dueStatus, initialLastDone, addMonthClamped, localDateStr } from '../src/utils.js';
import { computeResumePatch } from '../src/pause.js';

const L = (y, m, d, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const task = (lastDone, extra = {}) => ({ id: 'a', name: 'A', freq: 'monthly', done: true, lastDone, lastDoneBy: 'Al', lastDonePoints: 8, ...extra });
function resetAt(lastDone, now) {
  vi.setSystemTime(now);
  state.tasks = { a: task(lastDone) };
  state.pause = null;
  checkTaskResets();
  return !state.tasks.a.done;
}
const OLD_TZ = process.env.TZ;
beforeAll(() => { process.env.TZ = 'America/New_York'; });
afterAll(() => { process.env.TZ = OLD_TZ; });
beforeEach(() => { vi.useFakeTimers(); state.members = {}; state.tasks = {}; });
afterEach(() => vi.useRealTimers());

describe('monthly = same date next calendar month (#137)', () => {
  it('1 Jan resets on 1 Feb, not 31 Jan', () => {
    const d = L(2026, 1, 1, 9);
    expect(resetAt(d, L(2026, 1, 31, 23, 59))).toBe(false);
    expect(resetAt(d, L(2026, 2, 1, 0, 0))).toBe(true);
  });
  it('31 Jan resets on 28 Feb (non-leap)', () => {
    const d = L(2026, 1, 31, 9);
    expect(resetAt(d, L(2026, 2, 27, 12))).toBe(false);
    expect(resetAt(d, L(2026, 2, 28, 0, 0))).toBe(true);
  });
  it('31 Jan resets on 29 Feb (leap)', () => {
    const d = L(2028, 1, 31, 9);
    expect(resetAt(d, L(2028, 2, 28, 12))).toBe(false);
    expect(resetAt(d, L(2028, 2, 29, 0, 0))).toBe(true);
  });
  it('31 Mar resets on 30 Apr; 28 Feb resets on 28 Mar', () => {
    expect(resetAt(L(2026, 3, 31, 9), L(2026, 4, 29, 12))).toBe(false);
    expect(resetAt(L(2026, 3, 31, 9), L(2026, 4, 30))).toBe(true);
    expect(resetAt(L(2026, 2, 28, 9), L(2026, 3, 28))).toBe(true);
  });
  it('late completion on 5 Mar is due 5 Apr', () => {
    const d = L(2026, 3, 5, 18);
    expect(resetAt(d, L(2026, 4, 4, 23, 59))).toBe(false);
    expect(resetAt(d, L(2026, 4, 5, 0, 0))).toBe(true);
  });
  it('year rollover: 15 Dec resets 15 Jan', () => {
    expect(resetAt(L(2026, 12, 15, 9), L(2027, 1, 14, 23))).toBe(false);
    expect(resetAt(L(2026, 12, 15, 9), L(2027, 1, 15))).toBe(true);
  });
  it('DST-safe: done 1 Mar (EST), resets 1 Apr (EDT) at local midnight', () => {
    const d = L(2026, 3, 1, 9);
    expect(resetAt(d, L(2026, 3, 31, 23, 59))).toBe(false);
    expect(resetAt(d, L(2026, 4, 1, 0, 0))).toBe(true);
  });
});

describe('dueStatus for monthly', () => {
  const t = (lastDone, extra) => task(lastDone, { done: false, ...extra });
  it('ok -> soon (day before) -> overdue on the calendar date', () => {
    const d = L(2026, 1, 31, 9);
    expect(dueStatus(t(d), L(2026, 2, 26, 12))).toBe('ok');
    expect(dueStatus(t(d), L(2026, 2, 27, 12))).toBe('soon');
    expect(dueStatus(t(d), L(2026, 2, 28, 12))).toBe('overdue');
  });
  it('1 Jan is not overdue on 31 Jan', () => {
    expect(dueStatus(t(L(2026, 1, 1, 9)), L(2026, 1, 31, 12))).toBe('soon');
  });
  it('dueTime uses the calendar due date', () => {
    const d = L(2026, 1, 31, 9);
    expect(dueStatus(t(d, { dueTime: '18:00' }), L(2026, 2, 28, 17, 0))).toBe('soon');
    expect(dueStatus(t(d, { dueTime: '18:00' }), L(2026, 2, 28, 18, 0))).toBe('overdue');
  });
  it('other frequencies unchanged', () => {
    const d = L(2026, 1, 31, 9);
    expect(dueStatus({ ...t(d), freq: 'weekly' }, L(2026, 2, 7, 12))).toBe('overdue');
    expect(dueStatus({ ...t(d), freq: 'fortnightly' }, L(2026, 2, 13, 12))).toBe('soon');
  });
});

describe('helpers and pause', () => {
  it('addMonthClamped clamps and does not mutate', () => {
    const src = new Date(2026, 0, 31, 9, 30);
    const r = addMonthClamped(src, 1);
    expect(localDateStr(r)).toBe('2026-02-28');
    expect(r.getHours()).toBe(9);
    expect(localDateStr(src)).toBe('2026-01-31');
    expect(localDateStr(addMonthClamped(new Date(2026, 2, 31), -1))).toBe('2026-02-28');
  });
  it('initialLastDone(monthly) makes a new chore due today (not before)', () => {
    const now = L(2026, 3, 31, 10);
    const t = task(initialLastDone('monthly', now), { done: false });
    expect(localDateStr(new Date(t.lastDone))).toBe('2026-02-28');
    expect(dueStatus(t, now)).toBe('overdue'); // new monthly chore starts due, like other frequencies
    expect(dueStatus(t, L(2026, 3, 27, 10))).toBe('soon');
  });
  it('resume shifts monthly lastDone by the pause length; due follows the shifted anchor', () => {
    const lastDone = L(2026, 3, 5, 9), since = L(2026, 3, 20, 9), end = L(2026, 3, 27, 9);
    const p = computeResumePatch({ since }, { a: task(lastDone) }, {}, end);
    const shifted = p['tasks/a/lastDone'];
    expect(localDateStr(new Date(shifted))).toBe('2026-03-12');
    expect(dueStatus(task(shifted, { done: false }), L(2026, 4, 12, 12))).toBe('overdue');
    expect(dueStatus(task(shifted, { done: false }), L(2026, 4, 10, 12))).toBe('ok');
  });
});

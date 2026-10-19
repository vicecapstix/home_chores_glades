import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { checkTaskResets } from '../src/tasks.js';
import { dueStatus, daysSince } from '../src/utils.js';

const L = (y, m, d, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const task = (freq, lastDone) => ({ id: 'a', name: 'A', freq, done: true, lastDone, lastDoneBy: 'Al', lastDonePoints: 1 });
function resetAt(freq, lastDone, now) {
  vi.setSystemTime(now);
  state.tasks = { a: task(freq, lastDone) };
  checkTaskResets();
  return !state.tasks.a.done;
}

beforeEach(() => { vi.useFakeTimers(); state.members = {}; state.tasks = {}; });
afterEach(() => vi.useRealTimers());

describe('calendar-day resets (#102)', () => {
  it('daily done 21:00 stays done until local midnight, then resets', () => {
    const done = L(2026, 10, 12, 21);
    expect(resetAt('daily', done, L(2026, 10, 12, 23, 59))).toBe(false);
    expect(resetAt('daily', done, L(2026, 10, 13, 0, 0))).toBe(true);
  });
  it('daily done 21:00 is resettable next day at 20:00 (not 24h later)', () => {
    expect(resetAt('daily', L(2026, 10, 12, 21), L(2026, 10, 13, 20))).toBe(true);
  });
  it('daily done 00:05 is still done at 23:59 the same day', () => {
    expect(resetAt('daily', L(2026, 10, 12, 0, 5), L(2026, 10, 12, 23, 59))).toBe(false);
  });
  it('weekly done Sun 22:00 resets next Sun 00:00, not before', () => {
    const done = L(2026, 10, 11, 22); // Sunday
    expect(resetAt('weekly', done, L(2026, 10, 17, 23, 59))).toBe(false);
    expect(resetAt('weekly', done, L(2026, 10, 18, 0, 0))).toBe(true);
  });
  it('dueStatus agrees with the reset rule', () => {
    const done = L(2026, 10, 12, 21);
    vi.setSystemTime(L(2026, 10, 12, 23, 59));
    expect(dueStatus({ freq: 'daily', lastDone: done })).not.toBe('overdue');
    vi.setSystemTime(L(2026, 10, 13, 0, 1));
    expect(dueStatus({ freq: 'daily', lastDone: done })).toBe('overdue');
  });
  it('daysSince counts calendar days (also across DST changes)', () => {
    expect(daysSince(L(2026, 10, 12, 23, 59), L(2026, 10, 13, 0, 1))).toBe(1);
    expect(daysSince(L(2026, 11, 1, 0, 30), L(2026, 11, 2, 0, 30))).toBe(1);
    expect(daysSince(L(2026, 3, 8, 23), L(2026, 3, 9, 0, 5))).toBe(1);
  });
});

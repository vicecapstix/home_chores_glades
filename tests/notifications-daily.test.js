// #40: overdue notifications fire once per chore per day across the 30-minute checks,
// and the once-a-day flag resets on the next local day. Firebase is not involved.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { initNotifications, _resetForTests } from '../src/notifications.js';

const NOW = new Date(2026, 9, 14, 12).getTime(); // Wed 14 Oct 2026, 12:00 local
const MIN = 60000, DAY = 86400000;
const t = (id, o) => ({ id, name: id, freq: 'daily', done: false, lastDone: NOW - 3 * DAY, person: 'Ann', ...o });

let N;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  _resetForTests(); localStorage.clear();
  document.body.innerHTML = '<button id="btn-notify" class="hidden"></button>';
  state.tasks = { a: t('a'), b: t('b'), other: t('other', { person: 'Bob' }) };
  N = vi.fn(); N.permission = 'granted'; N.requestPermission = vi.fn();
  vi.stubGlobal('Notification', N); window.Notification = N;
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const shown = () => N.mock.calls.map(c => c[1].body).sort();

describe('overdue notifications: once per chore per day (#40)', () => {
  it('first check on start, then the 30-minute checks do not repeat the same chores', async () => {
    initNotifications(() => 'Ann');
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()).toEqual(['a is overdue', 'b is overdue']);
    await vi.advanceTimersByTimeAsync(30 * MIN);
    await vi.advanceTimersByTimeAsync(30 * MIN);
    expect(N).toHaveBeenCalledTimes(2);
  });

  it('a chore that becomes overdue later in the day is notified at the next check, once', async () => {
    initNotifications(() => 'Ann');
    await vi.advanceTimersByTimeAsync(0);
    state.tasks.c = t('c');
    await vi.advanceTimersByTimeAsync(30 * MIN);
    await vi.advanceTimersByTimeAsync(30 * MIN);
    expect(shown()).toEqual(['a is overdue', 'b is overdue', 'c is overdue']);
  });

  it('the flag resets on the next local day and is stored as that date', async () => {
    initNotifications(() => 'Ann');
    await vi.advanceTimersByTimeAsync(0);
    expect(localStorage.getItem('fc_last_notify_date')).toBe('2026-10-14');
    await vi.advanceTimersByTimeAsync(12 * 60 * MIN); // past midnight: 15 Oct 00:00
    expect(localStorage.getItem('fc_last_notify_date')).toBe('2026-10-15');
    expect(N).toHaveBeenCalledTimes(4); // a and b again, once each
    await vi.advanceTimersByTimeAsync(60 * MIN);
    expect(N).toHaveBeenCalledTimes(4);
  });

  it('never notifies another member’s chore', async () => {
    initNotifications(() => 'Ann');
    await vi.advanceTimersByTimeAsync(24 * 60 * MIN);
    expect(N.mock.calls.some(c => c[1].body.startsWith('other'))).toBe(false);
  });
});

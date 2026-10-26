import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { initNotifications, runOverdueCheck, runDueTimeCheck, selectDueTimeTasks, _resetForTests } from '../src/notifications.js';
import { setPauseUntil } from '../src/utils.js';

const NOW = new Date(2026, 9, 14, 12).getTime();
const DAY = 86400000;
const t = (id, o) => ({ id, name: id, freq: 'daily', done: false, lastDone: NOW - 3 * DAY, person: 'Ann', ...o });

function stubNotification(impl) {
  const ctor = vi.fn(impl);
  ctor.permission = 'granted';
  ctor.requestPermission = vi.fn();
  vi.stubGlobal('Notification', ctor);
  window.Notification = ctor;
  return ctor;
}
function stubSW(showNotification) {
  const reg = { showNotification };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve(reg), getRegistration: () => Promise.resolve(reg) },
  });
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  _resetForTests(); localStorage.clear();
  document.body.innerHTML = '<button id="btn-notify" class="hidden"></button>';
  state.tasks = { a: t('a'), b: t('b') };
});
afterEach(() => {
  vi.useRealTimers(); vi.unstubAllGlobals();
  delete navigator.serviceWorker;
});

describe('overdue notifications via service worker', () => {
  it('uses registration.showNotification and never the constructor', async () => {
    const N = stubNotification();
    const show = vi.fn().mockResolvedValue(undefined);
    stubSW(show);
    initNotifications(() => 'Ann');
    await runOverdueCheck();
    expect(show).toHaveBeenCalledTimes(2);
    expect(show.mock.calls[0][0]).toBe('FamilyFlow');
    expect(show.mock.calls[0][1].body).toContain('is overdue');
    expect(N).not.toHaveBeenCalled();
  });
  it('does not renotify a task already shown', async () => {
    stubNotification();
    const show = vi.fn().mockResolvedValue(undefined);
    stubSW(show);
    initNotifications(() => 'Ann');
    await runOverdueCheck(); await runOverdueCheck();
    expect(show).toHaveBeenCalledTimes(2);
  });
  it('falls back to the constructor when the SW path fails', async () => {
    const N = stubNotification();
    stubSW(vi.fn().mockRejectedValue(new Error('no')));
    initNotifications(() => 'Ann');
    await runOverdueCheck();
    expect(N).toHaveBeenCalledTimes(2);
  });
});

describe('constructor failures (Android)', () => {
  it('a throwing constructor neither breaks the loop nor marks the task notified', async () => {
    let boom = true;
    const N = stubNotification(() => { if (boom) throw new TypeError('Illegal constructor'); });
    initNotifications(() => 'Ann');
    await expect(runOverdueCheck()).resolves.not.toThrow();
    expect(N).toHaveBeenCalledTimes(2); // loop continued past first throw
    boom = false;
    await runOverdueCheck(); // tasks were not marked, so they retry
    expect(N).toHaveBeenCalledTimes(4);
    await runOverdueCheck(); // now marked
    expect(N).toHaveBeenCalledTimes(4);
  });
});

describe('due-time reminders (#150)', () => {
  const due = (id, o) => ({ id, name: id, freq: 'once', dueDate: '2026-10-14', dueTime: '09:00', done: false, person: 'Ann', lastDone: NOW - DAY, ...o });
  const withShow = () => { const show = vi.fn().mockResolvedValue(undefined); stubSW(show); return show; };
  beforeEach(() => { state.tasks = {}; stubNotification(); initNotifications(() => 'Ann'); });
  afterEach(() => setPauseUntil(''));

  it('notifies once for a chore whose dueTime passed today, via the service worker', async () => {
    const show = withShow();
    state.tasks = { a: due('a') };
    await runDueTimeCheck();
    expect(show).toHaveBeenCalledTimes(1);
    expect(show.mock.calls[0][1].body).toBe('a was due at 09:00');
    expect(show.mock.calls[0][1].tag).toBe('ff-due-a');
    await runDueTimeCheck();
    expect(show).toHaveBeenCalledTimes(1);
  });
  it('is once per chore per day (flag resets next day)', async () => {
    const show = withShow();
    state.tasks = { a: due('a', { freq: 'daily', dueDate: undefined, lastDone: NOW - DAY }) };
    await runDueTimeCheck(); await runDueTimeCheck();
    expect(show).toHaveBeenCalledTimes(1);
    state.tasks.a.lastDone = NOW; // done today, due again tomorrow
    vi.setSystemTime(NOW + DAY);
    await runDueTimeCheck(NOW + DAY);
    expect(show).toHaveBeenCalledTimes(2);
  });
  it('waits until the due time; skips done, other people and earlier-day chores; includes Anyone', async () => {
    const show = withShow();
    state.tasks = {
      early: due('early', { dueTime: '18:00' }),
      done: due('done', { done: true }),
      other: due('other', { person: 'Bob' }),
      anyone: due('anyone', { person: '' }),
      yday: due('yday', { dueDate: '2026-10-13' }),
    };
    await runDueTimeCheck();
    expect(show).toHaveBeenCalledTimes(1);
    expect(show.mock.calls[0][1].tag).toBe('ff-due-anyone');
  });
  it('is suppressed while paused', async () => {
    const show = withShow();
    setPauseUntil('2026-10-20');
    state.tasks = { a: due('a') };
    await runDueTimeCheck();
    expect(show).not.toHaveBeenCalled();
  });
  it('does nothing without permission or a logged-in member', async () => {
    const show = withShow();
    state.tasks = { a: due('a') };
    Notification.permission = 'denied';
    await runDueTimeCheck();
    Notification.permission = 'granted';
    initNotifications(() => '');
    await runDueTimeCheck();
    expect(show).not.toHaveBeenCalled();
  });
  it('weekdays chores fire on their scheduled day only', () => {
    const wk = days => ({ id: 'w', name: 'w', freq: 'weekdays', days, dueTime: '09:00', done: false, person: 'Ann', lastDone: NOW - 3 * DAY });
    expect(selectDueTimeTasks({ w: wk([3]) }, 'Ann', NOW)).toHaveLength(1); // Wed
    expect(selectDueTimeTasks({ w: wk([1]) }, 'Ann', NOW)).toHaveLength(0);
  });
});

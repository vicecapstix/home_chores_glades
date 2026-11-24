import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), get READONLY() { return globalThis.__RO === true; } }));
import { runOverdueCheck, runDueTimeCheck, runToCheckNotify, initNotifications, _resetForTests } from '../src/notifications.js';
import { inQuietHours, getQuiet, toggleQuietHours, isHeld, DEFAULT_QUIET } from '../src/quiethours.js';

const DAY = 86400000;
const at = (h, m = 0, d = 14) => new Date(2026, 9, d, h, m).getTime();
const overdue = (id, name = id) => ({ id, name, freq: 'weekly', done: false, person: 'Ann', lastDone: at(12) - 20 * DAY });

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(at(12)); globalThis.__RO = false;
  localStorage.clear(); _resetForTests();
  const N = vi.fn(); N.permission = 'granted'; N.requestPermission = vi.fn();
  vi.stubGlobal('Notification', N); window.Notification = N;
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined });
  document.body.innerHTML = '<button id="btn-quiet" class="hidden"></button>';
  state.tasks = {};
  initNotifications(() => 'Ann');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('the quiet window (#401)', () => {
  it('defaults to 21:00-07:00: 20:59 / 21:00 / 06:59 / 07:00', () => {
    expect(getQuiet()).toEqual(DEFAULT_QUIET);
    expect(inQuietHours(at(20, 59))).toBe(false);
    expect(inQuietHours(at(21, 0))).toBe(true);
    expect(inQuietHours(at(6, 59))).toBe(true);
    expect(inQuietHours(at(7, 0))).toBe(false);
    expect(inQuietHours(at(0, 0))).toBe(true); // across midnight
  });
  it('can be turned off, and honours a stored window; junk falls back to the default', () => {
    localStorage.setItem('ff_quiet', JSON.stringify({ on: false }));
    expect(inQuietHours(at(23))).toBe(false);
    localStorage.setItem('ff_quiet', JSON.stringify({ on: true, start: 13 * 60, end: 15 * 60 }));
    expect(inQuietHours(at(14))).toBe(true);
    expect(inQuietHours(at(23))).toBe(false);
    localStorage.setItem('ff_quiet', '{nope');
    expect(getQuiet()).toEqual(DEFAULT_QUIET);
    localStorage.setItem('ff_quiet', JSON.stringify({ on: true, start: 99999, end: 'x' }));
    expect(getQuiet()).toEqual(DEFAULT_QUIET);
  });
});

describe('notifications are suppressed in quiet hours (#401)', () => {
  it('overdue, due-time and to-check show nothing at night; daytime still works', async () => {
    state.tasks = { a: overdue('a'), b: { id: 'b', name: 'Piano', freq: 'once', dueDate: '2026-10-14', dueTime: '09:00', done: false, person: 'Ann', lastDone: 0 } };
    vi.setSystemTime(at(22));
    await runOverdueCheck(); await runDueTimeCheck(); await runToCheckNotify(2);
    expect(Notification).not.toHaveBeenCalled();
    expect(isHeld()).toBe(true);
    vi.setSystemTime(at(12));
    localStorage.removeItem('ff_quiet_held');
    delete state.tasks.b;
    await runOverdueCheck();
    expect(Notification).toHaveBeenCalledTimes(1);
  });
  it('turned off, they fire at night as before', async () => {
    localStorage.setItem('ff_quiet', JSON.stringify({ on: false }));
    state.tasks = { a: overdue('a') };
    vi.setSystemTime(at(22));
    await runOverdueCheck();
    expect(Notification).toHaveBeenCalledTimes(1);
  });
});

describe('waking up sends at most one summary (#401)', () => {
  it('three held chores become one notification, not three, and none repeat', async () => {
    state.tasks = { a: overdue('a', 'Bins'), b: overdue('b', 'Dishes'), c: overdue('c', 'Floor') };
    vi.setSystemTime(at(23)); await runOverdueCheck();
    vi.setSystemTime(at(3)); await runOverdueCheck();
    expect(Notification).not.toHaveBeenCalled();
    vi.setSystemTime(at(7, 0, 15));
    await runOverdueCheck();
    expect(Notification).toHaveBeenCalledTimes(1);
    expect(Notification.mock.calls[0][1].body).toBe('3 chores need your attention');
    expect(isHeld()).toBe(false);
    await runOverdueCheck(); await runDueTimeCheck();
    expect(Notification).toHaveBeenCalledTimes(1);
  });
  it('one summary covers overdue and due-time chores together', async () => {
    state.tasks = { a: overdue('a'), b: { id: 'b', name: 'Piano', freq: 'once', dueDate: '2026-10-14', dueTime: '21:30', done: false, person: 'Ann', lastDone: 0 } };
    vi.setSystemTime(at(22)); await runOverdueCheck(); await runDueTimeCheck();
    vi.setSystemTime(at(3, 0, 15)); await runOverdueCheck(); // the 30-minute check rolls the day over while quiet
    vi.setSystemTime(at(7, 0, 15));
    state.tasks.b.dueDate = '2026-10-15'; state.tasks.b.dueTime = '06:30';
    await runDueTimeCheck(); await runOverdueCheck();
    expect(Notification).toHaveBeenCalledTimes(1);
    expect(Notification.mock.calls[0][1].body).toBe('2 chores need your attention');
  });
  it('a single held chore is shown as itself', async () => {
    state.tasks = { a: overdue('a', 'Bins') };
    vi.setSystemTime(at(23)); await runOverdueCheck();
    vi.setSystemTime(at(7, 0, 15)); await runOverdueCheck();
    expect(Notification).toHaveBeenCalledTimes(1);
    expect(Notification.mock.calls[0][1].body).toBe('Bins is overdue');
  });
  it('the to-check notification, suppressed at night, fires once after quiet hours', async () => {
    vi.setSystemTime(at(22)); expect(await runToCheckNotify(2)).toBe(false);
    vi.setSystemTime(at(7, 0, 15)); expect(await runToCheckNotify(2)).toBe(true);
    expect(Notification).toHaveBeenCalledTimes(1);
    expect(await runToCheckNotify(2)).toBe(false);
  });
});

describe('the device toggle (#401)', () => {
  it('shows once notifications are granted, toggles on/off and stores locally only', () => {
    initNotifications(() => 'Ann');
    const btn = document.getElementById('btn-quiet');
    expect(btn.classList.contains('hidden')).toBe(false);
    expect(btn.getAttribute('aria-label')).toBe('Quiet hours 21:00-07:00: on. Tap to turn off');
    expect(toggleQuietHours()).toBe(false);
    expect(getQuiet().on).toBe(false);
    expect(btn.getAttribute('aria-label')).toBe('Quiet hours 21:00-07:00: off. Tap to turn on');
    expect(toggleQuietHours()).toBe(true);
  });
  it('is hidden without permission and inert on the TV', () => {
    Notification.permission = 'default';
    initNotifications(() => 'Ann');
    expect(document.getElementById('btn-quiet').classList.contains('hidden')).toBe(true);
    globalThis.__RO = true;
    expect(toggleQuietHours()).toBe(true);
    expect(localStorage.getItem('ff_quiet')).toBeNull();
  });
});

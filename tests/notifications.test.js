import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { initNotifications, runOverdueCheck, _resetForTests } from '../src/notifications.js';

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

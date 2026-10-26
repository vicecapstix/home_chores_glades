import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn(() => Promise.resolve()), patchPaths: vi.fn(() => Promise.resolve()) }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { startRollover } from '../src/rollover.js';
import { initNotifications, _resetForTests } from '../src/notifications.js';

const NOW = new Date(2026, 9, 14, 8, 30).getTime(); // Wed 08:30, chore due 09:00

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  localStorage.clear(); _resetForTests();
  const N = vi.fn(); N.permission = 'granted'; N.requestPermission = vi.fn();
  vi.stubGlobal('Notification', N); window.Notification = N;
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined });
  document.body.innerHTML = '<button id="btn-notify"></button>';
  state.tasks = { a: { id: 'a', name: 'Piano', freq: 'once', dueDate: '2026-10-14', dueTime: '09:00', done: false, person: 'Ann', lastDone: 0 } };
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('due-time reminder on the rollover timer (#150)', () => {
  it('fires from the rollover tick once the due time passes, without a new interval', async () => {
    Notification.permission = 'default';
    initNotifications(() => 'Ann'); // no 30-minute overdue timer while permission is not yet granted
    Notification.permission = 'granted';
    const spy = vi.spyOn(globalThis, 'setInterval');
    const stop = startRollover(vi.fn());
    expect(spy).toHaveBeenCalledTimes(1); // only the rollover interval
    await vi.advanceTimersByTimeAsync(10 * 60000);
    expect(Notification).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(25 * 60000); // 09:05
    expect(Notification).toHaveBeenCalledTimes(1);
    expect(Notification.mock.calls[0][1].body).toBe('Piano was due at 09:00');
    await vi.advanceTimersByTimeAsync(10 * 60000);
    expect(Notification).toHaveBeenCalledTimes(1);
    stop();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
import { runDueTimeCheck, initNotifications } from '../src/notifications.js';

describe('due-time reminder on the readonly TV (#150)', () => {
  it('never notifies', async () => {
    const N = vi.fn(); N.permission = 'default';
    vi.stubGlobal('Notification', N); window.Notification = N;
    state.tasks = { a: { id: 'a', name: 'x', freq: 'once', dueDate: '2000-01-01', dueTime: '00:00', done: false, person: 'Ann' } };
    initNotifications(() => 'Ann');
    N.permission = 'granted';
    await runDueTimeCheck(new Date('2000-01-01T12:00:00').getTime());
    expect(N).not.toHaveBeenCalled();
  });
});

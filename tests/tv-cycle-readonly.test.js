import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true, TV_CYCLE: true }));
vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn(), patchPaths: vi.fn() }));
import * as fb from '../src/firebase.js';
import { initTvCycle, refreshTvCycle } from '../src/tv.js';

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<section id="tv-panel" class="hidden"></section>';
});
afterEach(() => vi.useRealTimers());

describe('TV auto-cycle in readonly mode (#148)', () => {
  it('rotates on its own and makes no Firebase writes', () => {
    const c = initTvCycle(n => '<p>' + n + '</p>');
    expect(c).not.toBeNull();
    vi.advanceTimersByTime(60000);
    expect(c.current()).toBe('rewards');
    refreshTvCycle();
    expect(document.getElementById('tv-panel').innerHTML).toContain('<p>rewards</p>');
    for (const fn of Object.values(fb)) expect(fn).not.toHaveBeenCalled();
    c.stop();
  });
});

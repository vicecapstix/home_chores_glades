import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn(() => Promise.resolve()) }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import * as fb from '../src/firebase.js';
import { startRollover } from '../src/rollover.js';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-05-11T20:00:00')); vi.clearAllMocks(); });
afterEach(() => vi.useRealTimers());

describe('readonly TV rollover (#88)', () => {
  it('rolls over locally with no writes', () => {
    state.tasks = { t1: { id: 't1', name: 'Dishes', freq: 'daily', done: true, lastDone: Date.now() } };
    const render = vi.fn();
    startRollover(render);
    vi.advanceTimersByTime(25 * 3600000);
    expect(state.tasks.t1.done).toBe(false);
    expect(render).toHaveBeenCalled();
    expect(fb.patchRoot).not.toHaveBeenCalled();
  });
});

// #249: a screen left open past a house pause / away end must end it from the rollover tick.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn(() => Promise.resolve()), patchPaths: vi.fn(() => Promise.resolve()),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import * as fb from '../src/firebase.js';
import { startRollover } from '../src/rollover.js';

const H = 3600000, DAY = 24 * H;
let stop;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-05-11T20:00:00'));
  vi.clearAllMocks();
  state.pause = null;
  state.members = {};
  state.tasks = { t1: { id: 't1', name: 'Dishes', freq: 'daily', person: 'Bo', done: true, lastDone: Date.now() - 5 * DAY, lastDoneBy: 'Bo', lastDonePoints: 1 } };
});
afterEach(() => { stop && stop(); vi.useRealTimers(); });

describe('house pause ends from the rollover tick (AC1, AC2)', () => {
  it('clears the pause with one patchRoot and then resets the done daily chore', async () => {
    state.pause = { until: '2026-05-11', since: Date.now() - 3 * DAY, by: 'Mum' };
    stop = startRollover(vi.fn());
    await vi.advanceTimersByTimeAsync(5 * H); // crosses midnight at 4h; the pause clears on a tick
    await vi.advanceTimersByTimeAsync(3 * 60000);
    const pauseWrites = fb.patchRoot.mock.calls.filter(c => 'pause' in c[0]);
    expect(pauseWrites).toHaveLength(1);
    expect(pauseWrites[0][0].pause).toBeNull();
    expect(pauseWrites[0][0]['tasks/t1/lastDone']).toBeGreaterThan(Date.now() - 5 * DAY);
    expect(state.pause).toBeNull();
    expect(state.tasks.t1.done).toBe(false);
  });
  it('does nothing before the pause end date', async () => {
    state.pause = { until: '2026-05-12', since: Date.now() - DAY };
    stop = startRollover(vi.fn());
    await vi.advanceTimersByTimeAsync(3 * H); // 23:00 on the 11th, before the end date passes
    expect(fb.patchRoot).not.toHaveBeenCalled();
    expect(state.pause).not.toBeNull();
  });
});

describe('away period ends from the rollover tick (AC3)', () => {
  it('returns the member once awayUntil has passed', async () => {
    state.members = { Bo: { name: 'Bo', role: 'member', awayUntil: '2026-05-11', awaySince: Date.now() - 3 * DAY } };
    stop = startRollover(vi.fn());
    await vi.advanceTimersByTimeAsync(5 * H);
    expect(fb.patchPaths).toHaveBeenCalledTimes(1);
    expect(state.members.Bo.awayUntil).toBeUndefined();
  });
});

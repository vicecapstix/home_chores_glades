import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn(() => Promise.resolve()) }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import * as fb from '../src/firebase.js';
import { startRollover } from '../src/rollover.js';

const H = 3600000;
let stop;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-05-11T20:00:00'));
  vi.clearAllMocks();
  state.members = {};
});
afterEach(() => { stop && stop(); vi.useRealTimers(); });

describe('local rollover timer (#88)', () => {
  it('resets a done daily task after a day passes without a snapshot, and writes via patchRoot', () => {
    state.tasks = { t1: { id: 't1', name: 'Dishes', freq: 'daily', done: true, lastDone: Date.now(), lastDoneBy: 'A', lastDonePoints: 1 } };
    const render = vi.fn();
    stop = startRollover(render);
    vi.advanceTimersByTime(25 * H);
    expect(state.tasks.t1.done).toBe(false);
    expect(render).toHaveBeenCalled();
    expect(fb.patchRoot).toHaveBeenCalledWith(expect.objectContaining({ 'tasks/t1/done': false }));
  });
  it('re-renders when a soon task becomes overdue', () => {
    const due = new Date('2026-05-12T09:00:00');
    state.tasks = { t1: { id: 't1', name: 'Bins', freq: 'once', dueDate: '2026-05-12', dueTime: '09:00', done: false } };
    const render = vi.fn();
    stop = startRollover(render);
    vi.advanceTimersByTime(60000 * 5);
    expect(render).not.toHaveBeenCalled();
    vi.setSystemTime(new Date(due.getTime() + 1000));
    vi.advanceTimersByTime(60000);
    expect(render).toHaveBeenCalledTimes(1);
  });
  it('does not render when nothing changed', () => {
    state.tasks = { t1: { id: 't1', name: 'x', freq: 'weekly', done: false, lastDone: Date.now() } };
    const render = vi.fn();
    stop = startRollover(render);
    vi.advanceTimersByTime(60000 * 10);
    expect(render).not.toHaveBeenCalled();
  });
  it('ticks when the tab becomes visible again', () => {
    state.tasks = { t1: { id: 't1', name: 'Dishes', freq: 'daily', done: true, lastDone: Date.now() } };
    const render = vi.fn();
    stop = startRollover(render);
    vi.setSystemTime(Date.now() + 26 * H);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(render).toHaveBeenCalledTimes(1);
  });
});

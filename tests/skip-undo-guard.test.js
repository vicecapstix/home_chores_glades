import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import * as fb from '../src/firebase.js';
import { pushUndo } from '../src/undo.js';
import { skipTask } from '../src/tasks.js';

const NOW = new Date(2026, 9, 14, 12, 0, 0).getTime();
const DAY = 86400000;
const admin = () => true;
const mk = (o = {}) => ({ id: 't1', name: 'Wash car', freq: 'weekly', done: false, lastDone: NOW - 8 * DAY,
  person: 'Al', difficulty: 'easy', subtasks: {}, order: 1, ...o });

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.members = { Al: { name: 'Al', role: 'admin', points: 5 } };
  state.history = [];
  state.tasks = { t1: mk() };
});
afterEach(() => vi.useRealTimers());

describe('undo of a Skip is guarded against live state (#309)', () => {
  it('does nothing (with a toast) if the chore was ticked after the skip', async () => {
    await skipTask('t1', admin);
    const undo = pushUndo.mock.calls[0][0].undo;
    // another device ticks the chore inside the undo window
    state.tasks.t1 = { ...state.tasks.t1, done: true, lastDone: NOW + 1000, skippedAt: null, lastDoneBy: 'Bo' };
    fb.patchTask.mockClear();
    await expect(undo()).rejects.toThrow('the chore has changed');
    expect(fb.patchTask).not.toHaveBeenCalled();
    expect(state.tasks.t1.done).toBe(true);
    expect(state.tasks.t1.lastDone).toBe(NOW + 1000);
  });

  it('does nothing if lastDone no longer equals the skip time', async () => {
    await skipTask('t1', admin);
    const undo = pushUndo.mock.calls[0][0].undo;
    state.tasks.t1 = { ...state.tasks.t1, lastDone: NOW + 5000 };
    fb.patchTask.mockClear();
    await expect(undo()).rejects.toThrow();
    expect(fb.patchTask).not.toHaveBeenCalled();
    expect(state.tasks.t1.lastDone).toBe(NOW + 5000);
  });

  it('through the real undo.js a blocked undo reports failure, not "Restored"', async () => {
    const real = await vi.importActual('../src/undo.js');
    document.body.innerHTML = '<div id="undo-toast"></div><span id="undo-label"></span><button id="undo-btn"></button>';
    await skipTask('t1', admin);
    real.pushUndo(pushUndo.mock.calls[0][0]);
    state.tasks.t1 = { ...state.tasks.t1, done: true, lastDone: NOW + 1000, skippedAt: null };
    await real.popUndo();
    const { showToast } = await import('../src/ui.js');
    const msgs = showToast.mock.calls.map(c => c[0]);
    expect(msgs.some(m => /^Restore failed/.test(m))).toBe(true);
    expect(msgs).not.toContain('Restored');
  });

  it('undo straight after a skip still restores lastDone and skippedAt', async () => {
    const prev = state.tasks.t1.lastDone;
    await skipTask('t1', admin);
    await pushUndo.mock.calls[0][0].undo();
    expect(fb.patchTask).toHaveBeenLastCalledWith('t1', { lastDone: prev, skippedAt: null });
    expect(state.tasks.t1.lastDone).toBe(prev);
  });

  it('keeps the READONLY / non-admin guards on skipTask', async () => {
    await skipTask('t1', () => false);
    expect(fb.patchTask).not.toHaveBeenCalled();
    expect(pushUndo).not.toHaveBeenCalled();
  });
});

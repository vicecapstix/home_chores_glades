import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { dueStatus, initialLastDone } from '../src/utils.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { saveTask, editTask } from '../src/tasks.js';

// 2026-10-13 is a Tuesday (local time).
const at = (day, h = 12) => new Date(2026, 9, day, h, 0, 0).getTime();
const SUN = 11, MON = 12, TUE = 13, WED = 14;
afterEach(() => vi.useRealTimers());
const fresh = (days, now) => ({ freq: 'weekdays', days, done: false, lastDone: initialLastDone('weekdays', now) });

describe('initialLastDone for weekdays (#69)', () => {
  it('is local start of today minus 1 ms', () => {
    expect(initialLastDone('weekdays', at(TUE, 15))).toBe(new Date(2026, 9, TUE, 0, 0, 0).getTime() - 1);
  });
  it('created on a scheduled day -> soon (due today)', () => {
    vi.useFakeTimers(); vi.setSystemTime(at(TUE, 9));
    expect(dueStatus(fresh([2], Date.now()))).toBe('soon');
  });
  it('created on a non-scheduled day -> ok, not overdue', () => {
    vi.useFakeTimers(); vi.setSystemTime(at(WED, 9));
    expect(dueStatus(fresh([2], Date.now()))).toBe('ok');
  });
  it('Sunday/Monday boundary', () => {
    vi.useFakeTimers(); vi.setSystemTime(at(SUN, 23));
    expect(dueStatus(fresh([0], Date.now()))).toBe('soon');
    expect(dueStatus(fresh([1], Date.now()))).toBe('ok');
    vi.setSystemTime(at(MON, 0));
    expect(dueStatus(fresh([1], Date.now()))).toBe('soon');
    expect(dueStatus(fresh([0], Date.now()))).toBe('ok');
  });
  it('becomes due on the next scheduled day, not before', () => {
    const t = fresh([2], at(WED, 9));
    vi.useFakeTimers(); vi.setSystemTime(at(20, 0));
    expect(dueStatus(t)).toBe('soon');
  });
  it('other frequencies unchanged', () => {
    expect(initialLastDone('daily', at(TUE))).toBe(at(TUE) - 86400000);
  });
});

describe('switching a task to Specific days (#69)', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(at(TUE, 9));
    state.members = {};
    state.tasks = { t1: { id: 't1', name: 'Bins', freq: 'weekly', person: '', done: false, lastDone: at(TUE, 8) } };
    document.body.innerHTML = '<div id="tc-t1" class="task-card"></div>';
  });
  it('resets lastDone so a chore switched on its day is soon', async () => {
    editTask('t1', () => true);
    const card = document.getElementById('tc-t1');
    card.querySelector('.edit-freq').value = 'weekdays';
    card.querySelector('.edit-days input[value="2"]').checked = true;
    await saveTask('t1', () => true);
    expect(dueStatus(state.tasks.t1)).toBe('soon');
  });
  it('re-saving an existing weekdays task keeps its lastDone', async () => {
    state.tasks.t1 = { id: 't1', name: 'Bins', freq: 'weekdays', days: [2], person: '', done: false, lastDone: at(MON) };
    editTask('t1', () => true);
    await saveTask('t1', () => true);
    expect(state.tasks.t1.lastDone).toBe(at(MON));
  });
});

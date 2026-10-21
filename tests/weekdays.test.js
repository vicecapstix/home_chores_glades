import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { dueStatus, taskPoints, prevScheduledStart, initialLastDone, freqLabel } from '../src/utils.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { writeState } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { checkTaskResets, addTask, saveTask, editTask, readDays } from '../src/tasks.js';

// 2026-10-13 is a Tuesday (local time used throughout).
const at = (day, h = 12) => new Date(2026, 9, day, h, 0, 0).getTime();
const TUE = 13, WED = 14, THU = 15, FRI = 16, MON = 12, NEXT_TUE = 20;

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(at(WED)); });
afterEach(() => vi.useRealTimers());

describe('prevScheduledStart', () => {
  it('returns the most recent selected day that has begun', () => {
    expect(prevScheduledStart([2], at(WED))).toBe(new Date(2026, 9, TUE).getTime());
    expect(prevScheduledStart([2], at(TUE, 0))).toBe(new Date(2026, 9, TUE).getTime());
    expect(prevScheduledStart([1, 4], at(WED))).toBe(new Date(2026, 9, MON).getTime());
  });
  it('looks back across the week boundary and handles Sunday = 0', () => {
    vi.setSystemTime(at(MON));
    expect(prevScheduledStart([0], at(MON))).toBe(new Date(2026, 9, 11).getTime());
  });
  it('returns null with no valid days', () => {
    expect(prevScheduledStart([], at(WED))).toBeNull();
    expect(prevScheduledStart([9], at(WED))).toBeNull();
    expect(prevScheduledStart(undefined, at(WED))).toBeNull();
  });
});

describe('dueStatus for weekdays', () => {
  const task = (days, lastDone) => ({ freq: 'weekdays', days, lastDone, done: false });
  it('is due soon on the selected day', () => {
    vi.setSystemTime(at(TUE));
    expect(dueStatus(task([2], at(MON)))).toBe('soon');
  });
  it('is overdue after the selected day has passed without completion', () => {
    vi.setSystemTime(at(WED));
    expect(dueStatus(task([2], at(MON)))).toBe('overdue');
  });
  it('is ok when completed since the selected day began', () => {
    vi.setSystemTime(at(WED));
    expect(dueStatus(task([2], at(TUE, 9)))).toBe('ok');
  });
  it('becomes due again on the next selected day', () => {
    vi.setSystemTime(at(NEXT_TUE));
    expect(dueStatus(task([2], at(TUE, 9)))).toBe('soon');
    vi.setSystemTime(at(NEXT_TUE + 1));
    expect(dueStatus(task([2], at(TUE, 9)))).toBe('overdue');
  });
  it('handles multiple days (Mon/Thu)', () => {
    vi.setSystemTime(at(WED));
    expect(dueStatus(task([1, 4], at(MON, 8)))).toBe('ok');
    vi.setSystemTime(at(FRI));
    expect(dueStatus(task([1, 4], at(MON, 8)))).toBe('overdue');
    expect(dueStatus(task([1, 4], at(THU, 8)))).toBe('ok');
  });
  it('done tasks stay done and tasks with no days are never due', () => {
    expect(dueStatus({ freq: 'weekdays', days: [2], lastDone: 0, done: true })).toBe('done');
    expect(dueStatus(task([], 0))).toBe('ok');
  });
  it('existing frequencies are unaffected', () => {
    expect(dueStatus({ freq: 'daily', lastDone: at(WED) - 2 * 86400000, done: false })).toBe('overdue');
    expect(dueStatus({ freq: 'weekly', lastDone: at(WED), done: false })).toBe('ok');
  });
});

describe('points, labels, initial state', () => {
  it('weekdays tasks score like weekly', () => {
    expect(taskPoints({ freq: 'weekdays', difficulty: 'easy' })).toBe(3);
    expect(taskPoints({ freq: 'weekdays', difficulty: 'hard' })).toBe(9);
  });
  it('labels days Mon-first', () => {
    expect(freqLabel({ freq: 'weekdays', days: [0, 4, 1] })).toBe('Mon, Thu, Sun');
    expect(freqLabel({ freq: 'weekly' })).toBe('weekly');
  });
  it('new weekday tasks are not instantly overdue; others unchanged', () => {
    expect(initialLastDone('weekdays')).toBe(Date.now());
    expect(initialLastDone('daily')).toBe(Date.now() - 86400000);
  });
});

describe('checkTaskResets across the week boundary', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('resets a done weekday task only once a later selected day begins', () => {
    state.tasks = { a: { id: 'a', freq: 'weekdays', days: [2], done: true, lastDone: at(TUE, 9) } };
    vi.setSystemTime(at(THU));
    checkTaskResets();
    expect(state.tasks.a.done).toBe(true);
    vi.setSystemTime(at(NEXT_TUE, 0));
    checkTaskResets();
    expect(state.tasks.a.done).toBe(false);
  });
  it('does not touch tasks with other frequencies differently', () => {
    state.tasks = { d: { id: 'd', freq: 'daily', done: true, lastDone: at(WED) - 2 * 86400000 } };
    checkTaskResets();
    expect(state.tasks.d.done).toBe(false);
  });
});

describe('add / edit UI', () => {
  const admin = () => true;
  beforeEach(() => {
    vi.clearAllMocks();
    state.tasks = {}; state.members = {}; state.nextId = 1;
    document.body.innerHTML =
      '<input id="new-task" value="Bins" /><select id="new-freq"><option value="weekly">w</option><option value="weekdays" selected>d</option></select>' +
      '<select id="new-person"><option value=""></option></select><select id="new-diff"><option value="easy">e</option></select><select id="new-cat"><option value=""></option></select>' +
      '<input id="new-duedate" /><textarea id="new-notes"></textarea>' +
      '<div id="new-days" class="day-chips"><input type="checkbox" value="2" checked /><input type="checkbox" value="4" checked /><input type="checkbox" value="1" /></div>';
  });
  it('addTask stores sorted days for a weekdays chore', async () => {
    await addTask(admin);
    const t = Object.values(state.tasks)[0];
    expect(t.freq).toBe('weekdays');
    expect(t.days).toEqual([2, 4]);
    expect(t.lastDone).toBeGreaterThan(Date.now() - 1000);
    expect(writeState).toHaveBeenCalled();
  });
  it('addTask refuses a weekdays chore with no days', async () => {
    document.querySelectorAll('#new-days input').forEach(i => { i.checked = false; });
    await addTask(admin);
    expect(Object.keys(state.tasks)).toHaveLength(0);
    expect(showToast).toHaveBeenCalledWith('Pick at least one day');
  });
  it('edit form pre-checks days and saveTask persists changes / clears days on switch', async () => {
    state.tasks = { t1: { id: 't1', name: 'Bins', freq: 'weekdays', days: [2], person: '', done: false, lastDone: 0 } };
    document.body.innerHTML = '<div id="tc-t1" class="task-card"></div>';
    editTask('t1', () => true);
    const card = document.getElementById('tc-t1');
    expect(readDays(card.querySelector('.edit-days'))).toEqual([2]);
    card.querySelector('.edit-days input[value="5"]').checked = true;
    await saveTask('t1', admin);
    expect(state.tasks.t1.days).toEqual([2, 5]);
    editTask('t1', () => true);
    card.querySelector('.edit-freq').value = 'weekly';
    await saveTask('t1', admin);
    expect(state.tasks.t1.freq).toBe('weekly');
    expect(state.tasks.t1.days).toBeUndefined();
  });
});

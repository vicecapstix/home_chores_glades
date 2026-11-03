// #255: monthly chores on a set day of the month. Fixed dates only; Firebase is mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn(), patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn().mockResolvedValue(undefined), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchPaths, patchRoot } from '../src/firebase.js';
import * as ui from '../src/ui.js';
import { checkTaskResets, addTask, saveTask } from '../src/tasks.js';
import { dueStatus, freqLabel, validMonthDay, monthDayLabel, cycleDays, initialLastDone, weekPlan } from '../src/utils.js';
import { dueDays, weekDates } from '../src/printchart.js';
import { makeTask } from '../src/starter.js';
import { buildChoreFile, validateChoreFile } from '../src/chorefile.js';
import { buildBackup } from '../src/backup.js';
import { validateBackup } from '../src/restore.js';

const D = (m, d, h = 12) => new Date(2026, m - 1, d, h).getTime();
const admin = () => true, notAdmin = () => false;
const mk = (o = {}) => ({ id: 'a', name: 'Sheets', freq: 'monthly', monthDay: 15, done: false, lastDone: D(9, 15), person: 'Ann', difficulty: 'easy', ...o });

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(D(10, 10));
  state.pause = null; state.tasks = {}; state.templates = {}; state.nextId = 1;
  state.members = { Ann: { name: 'Ann', role: 'admin' } };
});
afterEach(() => vi.useRealTimers());

describe('validMonthDay / label', () => {
  it('accepts 1-28, numeric strings and last; rejects everything else', () => {
    expect(validMonthDay(1)).toBe(1); expect(validMonthDay('28')).toBe(28); expect(validMonthDay('last')).toBe('last');
    for (const v of [0, 29, 31, -1, 2.5, '', 'abc', null, undefined, NaN, 'Last']) expect(validMonthDay(v)).toBe(0);
  });
  it('labels ordinals', () => {
    const nums = [1, 2, 3, 4, 11, 12, 15, 21, 22, 23];
    expect(nums.map(monthDayLabel)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '15th', '21st', '22nd', '23rd']);
    expect(monthDayLabel('last')).toBe('last day'); expect(monthDayLabel(40)).toBe('');
  });
});

describe('due status (AC2)', () => {
  const st = (m, d, o) => dueStatus(mk(o), D(m, d));
  it('monthDay 15, done 15 Sep: ok on 10 Oct, soon on 14 and 15 Oct, overdue on 16 Oct', () => {
    expect(st(10, 10)).toBe('ok'); expect(st(10, 13)).toBe('ok');
    expect(st(10, 14)).toBe('soon'); expect(st(10, 15)).toBe('soon'); expect(st(10, 16)).toBe('overdue');
  });
  it('done late (16 Oct) is next due 15 Nov, not 15 Oct again', () => {
    expect(cycleDays(mk({ lastDone: D(10, 16) }), D(10, 16))).toBe(30);
    expect(dueStatus(mk({ lastDone: D(10, 16) }), D(11, 14))).toBe('soon');
  });
  it("'last' in February is the 28th (2027) and the 29th (2028 leap year)", () => {
    const at = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
    const t = mk({ monthDay: 'last', lastDone: at(2027, 1, 31) });
    expect(dueStatus(t, at(2027, 2, 26))).toBe('ok');
    expect(dueStatus(t, at(2027, 2, 27))).toBe('soon');
    expect(dueStatus(t, at(2027, 3, 1))).toBe('overdue');
    expect(cycleDays({ freq: 'monthly', monthDay: 'last' }, at(2028, 1, 31))).toBe(29);
    expect(cycleDays({ freq: 'monthly', monthDay: 'last' }, at(2027, 1, 31))).toBe(28);
  });
  it('without monthDay the existing calendar-month behaviour is unchanged', () => {
    expect(cycleDays({ freq: 'monthly' }, D(9, 15))).toBe(30);
    expect(dueStatus(mk({ monthDay: undefined }), D(10, 16))).toBe('overdue');
    expect(dueStatus(mk({ monthDay: undefined }), D(10, 10))).toBe('ok');
  });
  it('an invalid monthDay is ignored', () => {
    expect(cycleDays({ freq: 'monthly', monthDay: 31 }, D(9, 15))).toBe(30);
  });
  it('a done chore resets after its day, not before', () => {
    state.tasks = { a: mk({ done: true, lastDoneBy: 'Ann' }) };
    vi.setSystemTime(D(10, 14)); checkTaskResets(); expect(state.tasks.a.done).toBe(true);
    vi.setSystemTime(D(10, 15)); checkTaskResets(); expect(state.tasks.a.done).toBe(false);
    expect(patchRoot).toHaveBeenCalledTimes(1);
  });
  it('a new chore starts on its next set day, not overdue', () => {
    const now = D(11, 3);
    expect(dueStatus(mk({ monthDay: 1, lastDone: initialLastDone({ freq: 'monthly', monthDay: 1 }, now) }), now)).toBe('ok');
    expect(dueStatus(mk({ monthDay: 15, lastDone: initialLastDone({ freq: 'monthly', monthDay: 15 }, now) }), now)).toBe('ok');
    const lastDay = new Date(initialLastDone({ freq: 'monthly', monthDay: 'last' }, now));
    expect(lastDay.getMonth()).toBe(9); expect(lastDay.getDate()).toBe(31);
  });
});

describe('card, planner and print chart (AC3)', () => {
  it('card label reads "monthly · 15th"', () => {
    expect(freqLabel(mk())).toBe('monthly · 15th'); expect(freqLabel(mk({ monthDay: 'last' }))).toBe('monthly · last day');
    expect(freqLabel(mk({ monthDay: undefined }))).toBe('monthly');
  });
  it('This week planner places it on the set day', () => {
    vi.setSystemTime(D(10, 14)); // Wed 14 Oct 2026; week Mon 12 - Sun 18
    const plan = weekPlan({ a: mk() }, D(10, 14));
    expect(plan.find(d => d.items.length).date).toBe('2026-10-15');
  });
  it('print chart marks only the weekday that falls on the set day', () => {
    const dates = weekDates('2026-10-12');
    expect(dueDays(mk(), dates)).toEqual({ days: [false, false, false, true, false, false, false], anyDay: false }); // Thu 15 Oct
    expect(dueDays(mk({ monthDay: 20 }), dates)).toEqual({ days: Array(7).fill(false), anyDay: false });
    expect(dueDays(mk({ monthDay: 'last' }), weekDates('2026-10-26')).days[5]).toBe(true); // Sat 31 Oct
    expect(dueDays(mk({ monthDay: undefined }), dates).anyDay).toBe(true);
  });
});

describe('templates, backup/restore, chore file, starter keep monthDay (AC4)', () => {
  it('template round-trip', () => {
    document.body.innerHTML = '<input id="tpl-name-input" value="T"><div id="tpl-list"></div><div id="templates-modal" class="hidden"></div><div id="toast"></div>';
    state.tasks = { a: mk({ monthDay: 'last' }), b: mk({ id: 'b', name: 'Other', freq: 'weekly', monthDay: 5 }) };
    ui.saveTemplate();
    const tpl = Object.values(state.templates)[0];
    expect(tpl.tasks[0].monthDay).toBe('last'); expect(tpl.tasks[1].monthDay).toBeUndefined();
    state.tasks = {}; ui.applyTemplate(tpl.id);
    expect(Object.values(state.tasks).find(t => t.freq === 'monthly').monthDay).toBe('last');
  });
  it('backup/restore keeps a valid monthDay and drops invalid or stray ones', () => {
    state.tasks = { a: mk(), b: mk({ id: 'b', monthDay: 40 }), c: mk({ id: 'c', freq: 'weekly' }) };
    state.templates = { x: { id: 'x', name: 'X', tasks: [{ name: 'M', freq: 'monthly', monthDay: 3 }, { name: 'N', freq: 'monthly', monthDay: 99 }] } };
    const r = validateBackup(buildBackup(state, new Date(2026, 9, 10)));
    expect(r.ok).toBe(true);
    expect(r.clean.tasks.a.monthDay).toBe(15);
    expect(r.clean.tasks.b.monthDay).toBeUndefined();
    expect(r.clean.tasks.c.monthDay).toBeUndefined();
    expect(r.clean.templates.x.tasks[0].monthDay).toBe(3); expect(r.clean.templates.x.tasks[1].monthDay).toBeUndefined();
  });
  it('chore file round-trip and rejects a bad monthDay', () => {
    const file = buildChoreFile({ a: mk() }, new Date(2026, 9, 10));
    expect(file.chores[0].monthDay).toBe(15);
    const ok = validateChoreFile(JSON.stringify(file), {});
    expect(ok.error).toBeUndefined();
    expect(ok.chores[0].monthDay).toBe(15);
    const bad = validateChoreFile(JSON.stringify({ ...file, chores: [{ ...file.chores[0], monthDay: 31 }] }), {});
    expect(bad.chores).toEqual([]); expect(JSON.stringify(bad)).toMatch(/Month day/);
  });
  it('starter makeTask keeps a valid monthDay and drops an invalid one', () => {
    const def = md => ({ name: 'Beds', freq: 'monthly', monthDay: md, difficulty: 'easy', category: '' });
    expect(makeTask(def('last'), 't1', D(11, 3), 0).monthDay).toBe('last');
    expect(makeTask(def(31), 't1', D(11, 3), 0).monthDay).toBeUndefined();
  });
});

describe('add / edit form (AC1, AC5)', () => {
  const addDom = (freq, md) => {
    document.body.innerHTML = '<input id="new-task" value="Sheets"><select id="new-freq"><option value="' + freq + '" selected></option></select><select id="new-monthday"><option value="' + md + '" selected></option></select>' +
      '<select id="new-person"><option value="">Anyone</option></select><select id="new-diff"><option>easy</option></select>' +
      '<select id="new-cat"><option value=""></option></select><input id="new-duedate"><input id="new-duetime"><textarea id="new-notes"></textarea>' +
      '<div id="new-days" class="day-chips"></div><div id="toast"></div>';
  };
  const card = (freq, md) => {
    document.body.innerHTML = '<div id="tc-a" class="task-card editing"><input class="edit-name" value="Sheets"><select class="edit-freq"><option value="' + freq + '" selected></option></select>' +
      '<select class="edit-monthday"><option value="' + md + '" selected></option></select><div class="edit-days"></div><input class="edit-duedate"><input class="edit-duetime">' +
      '<select class="edit-diff"><option>easy</option></select><select class="edit-cat"><option value=""></option></select><select class="edit-person"><option value="Ann">Ann</option></select><textarea class="edit-notes"></textarea></div><div id="toast"></div>';
  };
  it("add stores a valid monthDay; blank or invalid keeps today's behaviour", async () => {
    addDom('monthly', '1'); await addTask(admin); vi.advanceTimersByTime(5);
    addDom('monthly', ''); await addTask(admin); vi.advanceTimersByTime(5);
    addDom('monthly', '31'); await addTask(admin); vi.advanceTimersByTime(5);
    addDom('weekly', '5'); await addTask(admin);
    const ts = Object.values(state.tasks);
    expect(ts).toHaveLength(4);
    expect(ts.map(t => t.monthDay)).toEqual([1, undefined, undefined, undefined]);
  });
  it('edit saves, changes and clears monthDay', async () => {
    state.tasks = { a: mk({ monthDay: undefined }) };
    card('monthly', 'last'); await saveTask('a', admin);
    expect(state.tasks.a.monthDay).toBe('last'); expect(patchPaths.mock.calls[0][0]['tasks/a/monthDay']).toBe('last');
    card('monthly', ''); await saveTask('a', admin);
    expect(state.tasks.a.monthDay).toBeUndefined(); expect(patchPaths.mock.calls[1][0]['tasks/a/monthDay']).toBeNull();
    card('monthly', '12'); await saveTask('a', admin);
    card('weekly', '12'); await saveTask('a', admin);
    expect(state.tasks.a.monthDay).toBeUndefined();
  });
  it('a non-admin cannot add or save a monthDay', async () => {
    state.tasks = { a: mk() };
    addDom('monthly', '1'); await addTask(notAdmin);
    card('monthly', '3'); await saveTask('a', notAdmin);
    expect(Object.keys(state.tasks)).toEqual(['a']); expect(state.tasks.a.monthDay).toBe(15);
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

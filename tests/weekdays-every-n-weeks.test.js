// #314: Weekdays chores that repeat every 2, 3 or 4 weeks (everyWeeks + weekAnchor).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

const cfg = vi.hoisted(() => ({ ro: false }));
vi.mock('../src/config.js', async orig => ({ ...(await orig()), get READONLY() { return cfg.ro; } }));
vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn(), patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn(async f => { for (const [k, v] of Object.entries(f)) { const [, id, field] = k.split('/'); if (state.tasks[id] && field) state.tasks[id][field] = v; } }),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', async orig => ({ ...(await orig()), showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchPaths } from '../src/firebase.js';
import { validEveryWeeks, weekIsOn, dueStatus, weekPlan, freqLabel } from '../src/utils.js';
import { addTask, saveTask, checkTaskResets } from '../src/tasks.js';
import { dueDays, weekDates } from '../src/printchart.js';
import { templateTask, applyTemplate } from '../src/ui.js';
import { buildChoreFile, validateChoreFile, addPayload } from '../src/chorefile.js';

const at = (s) => new Date(s).getTime();
// Anchor week: Monday 2026-10-26. Every 2 weeks => on: Oct 26, Nov 9, Nov 23; off: Nov 2, Nov 16, Nov 30.
const bins = (o = {}) => ({ id: 't1', name: 'Bins', freq: 'weekdays', days: [2], everyWeeks: 2, weekAnchor: '2026-10-26', difficulty: 'easy',
  person: '', done: false, lastDone: at('2026-10-27T12:00:00'), subtasks: {}, ...o });
const admin = () => true, notAdmin = () => false;

beforeEach(() => {
  vi.clearAllMocks(); cfg.ro = false; vi.useFakeTimers(); vi.setSystemTime(at('2026-11-10T09:00:00'));
  state.members = { Al: { name: 'Al', role: 'admin' } }; state.tasks = {}; state.templates = {}; state.nextId = 1; state.pause = null;
  document.body.innerHTML = '<div id="toast"></div>';
});
afterEach(() => vi.useRealTimers());

describe('week on/off (AC2)', () => {
  it('validEveryWeeks accepts 2-4 only, else 1', () => {
    expect([2, 3, 4, '3'].map(validEveryWeeks)).toEqual([2, 3, 4, 3]);
    for (const v of [0, 1, 5, 2.5, 'x', null, undefined, '']) expect(validEveryWeeks(v)).toBe(1);
  });
  it('every 2 weeks from the anchor week, any day of the week', () => {
    const on = d => weekIsOn(bins(), at(d)), t = bins();
    expect([on('2026-10-26T00:30:00'), on('2026-11-01T23:30:00'), on('2026-11-02T08:00:00'), on('2026-11-09T08:00:00'), on('2026-11-15T23:00:00'), on('2026-11-16T08:00:00'), on('2026-11-23T08:00:00'), on('2026-10-19T08:00:00'), on('2026-10-12T08:00:00')])
      .toEqual([true, false, false, true, false, false, true, false, true]);
    expect(t.everyWeeks).toBe(2);
  });
  it('every 3 and 4 weeks', () => {
    const w = (n, d) => weekIsOn(bins({ everyWeeks: n }), at(d));
    expect([w(3, '2026-11-02T08:00:00'), w(3, '2026-11-16T08:00:00'), w(3, '2026-11-09T08:00:00'), w(4, '2026-11-23T08:00:00'), w(4, '2026-12-14T08:00:00'), w(4, '2026-11-30T08:00:00')])
      .toEqual([false, true, false, false, true, false]);
  });
  it('is on every week when unset, 1, invalid or without a valid anchor', () => {
    for (const o of [{ everyWeeks: undefined }, { everyWeeks: 1 }, { everyWeeks: 9 }, { weekAnchor: '' }, { weekAnchor: 'bad' }]) expect(weekIsOn(bins(o), at('2026-11-03T08:00:00'))).toBe(true);
  });
});

describe('due status and resets honour off-weeks (AC3)', () => {
  it('six weeks: a ticked chore is due again only on on-week Tuesdays', () => {
    const t = bins({ done: true });
    const tues = ['2026-10-27', '2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24', '2026-12-01'];
    const resets = tues.map(d => { vi.setSystemTime(at(d + '12:00:00'.replace(/^/, 'T'))); state.tasks = { t1: { ...t, done: true, lastDone: at('2026-10-27T12:00:00') } }; checkTaskResets(); return !state.tasks.t1.done; });
    expect(resets).toEqual([false, false, true, true, true, true]); // once reset on Nov 10 it stays due; first off-week Tuesday does not reset
  });
  it('an off-week Tuesday does not make a ticked chore due', () => {
    vi.setSystemTime(at('2026-11-17T09:00:00'));
    expect(dueStatus(bins({ lastDone: at('2026-11-10T12:00:00') }))).toBe('ok');
    state.tasks = { t1: bins({ done: true, lastDone: at('2026-11-10T12:00:00') }) }; checkTaskResets();
    expect(state.tasks.t1.done).toBe(true);
  });
  it('an on-week Tuesday is due; the days after are overdue; an off-week Wednesday is not newly overdue', () => {
    vi.setSystemTime(at('2026-11-10T09:00:00')); expect(dueStatus(bins())).toBe('soon');
    vi.setSystemTime(at('2026-11-11T09:00:00')); expect(dueStatus(bins())).toBe('overdue');
    vi.setSystemTime(at('2026-11-18T09:00:00')); expect(dueStatus(bins({ lastDone: at('2026-11-10T12:00:00') }))).toBe('ok');
  });
  it('default (every week) behaves as today', () => {
    vi.setSystemTime(at('2026-11-03T09:00:00'));
    expect(dueStatus(bins({ everyWeeks: undefined, weekAnchor: undefined }))).toBe('soon');
  });
});

describe('planner and print chart (AC3)', () => {
  it('week planner lists the chore only in on-weeks', () => {
    const tasks = { t1: bins() };
    const has = now => weekPlan(tasks, at(now)).some(d => d.items.length);
    expect([has('2026-11-04T09:00:00'), has('2026-11-10T09:00:00'), has('2026-11-17T09:00:00'), has('2026-11-24T09:00:00')]).toEqual([false, true, false, true]);
  });
  it('print chart marks the day only in on-weeks', () => {
    expect(dueDays(bins(), weekDates('2026-11-02')).days.some(Boolean)).toBe(false);
    expect(dueDays(bins(), weekDates('2026-11-09')).days).toEqual([false, true, false, false, false, false, false]);
  });
  it('label says how often', () => {
    expect(freqLabel(bins())).toBe('Tue · every 2 wks');
    expect(freqLabel(bins({ everyWeeks: undefined }))).toBe('Tue');
  });
});

describe('add and edit (AC1, AC4)', () => {
  function form(n, freq = 'weekdays') {
    document.body.innerHTML = '<div id="toast"></div><input id="new-task" value="Bins"><select id="new-freq"><option value="' + freq + '" selected>f</option></select>' +
      '<select id="new-person"><option value="" selected></option></select><select id="new-diff"><option value="easy" selected></option></select>' +
      '<select id="new-cat"><option value="" selected></option></select><input id="new-duedate" value=""><textarea id="new-notes"></textarea>' +
      '<div id="new-days"><input type="checkbox" value="2" checked></div><select id="new-everyweeks"><option value="' + n + '" selected>x</option></select>';
  }
  it('admin add saves every N weeks and the anchor (this week\'s Monday); 1 omits both', async () => {
    form('2'); await addTask(admin); vi.advanceTimersByTime(5);
    form('1'); await addTask(admin);
    const [a, b] = Object.values(state.tasks);
    expect(a.everyWeeks).toBe(2); expect(a.weekAnchor).toBe('2026-11-09');
    expect(b).not.toHaveProperty('everyWeeks'); expect(b).not.toHaveProperty('weekAnchor');
  });
  it('ignored for non-weekday frequencies', async () => {
    form('2', 'weekly'); await addTask(admin);
    expect(Object.values(state.tasks)[0]).not.toHaveProperty('everyWeeks');
  });
  it('non-admin and READONLY add write nothing', async () => {
    form('2'); await addTask(notAdmin); cfg.ro = true; await addTask(admin);
    expect(patchPaths).not.toHaveBeenCalled(); expect(state.tasks).toEqual({});
  });
  function editCard(n) {
    state.tasks.t1 = bins();
    document.body.innerHTML = '<div id="tc-t1"><input class="edit-name" value="Bins"><select class="edit-freq"><option value="weekdays" selected></option></select>' +
      '<div class="edit-days"><input type="checkbox" value="2" checked></div><input class="edit-interval"><input class="edit-duedate"><input class="edit-duetime"><select class="edit-diff"><option value="easy" selected></option></select>' +
      '<select class="edit-cat"><option value="" selected></option></select><select class="edit-person"><option value="" selected></option></select>' +
      '<select class="edit-everyweeks"><option value="' + n + '" selected></option></select><textarea class="edit-notes"></textarea></div>';
  }
  it('saveTask keeps the anchor when N is unchanged, re-anchors when N changes, clears at 1', async () => {
    editCard('2'); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[0][0]).toMatchObject({ 'tasks/t1/everyWeeks': 2, 'tasks/t1/weekAnchor': '2026-10-26' });
    editCard('3'); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[1][0]).toMatchObject({ 'tasks/t1/everyWeeks': 3, 'tasks/t1/weekAnchor': '2026-11-09' });
    editCard('1'); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[2][0]).toMatchObject({ 'tasks/t1/everyWeeks': null, 'tasks/t1/weekAnchor': null });
  });
  it('non-admin and READONLY edit write nothing', async () => {
    editCard('3'); await saveTask('t1', notAdmin); cfg.ro = true; await saveTask('t1', admin);
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('templates and chore files keep it (AC4)', () => {
  it('template stores everyWeeks (no anchor) and applying anchors to the current week', () => {
    const tt = templateTask(bins());
    expect(tt.everyWeeks).toBe(2); expect(tt).not.toHaveProperty('weekAnchor');
    expect(templateTask(bins({ freq: 'weekly', days: undefined }))).not.toHaveProperty('everyWeeks');
    state.templates = { tp: { id: 'tp', name: 'T', tasks: [{ ...tt, name: 'X' }] } };
    document.body.innerHTML = '<div id="tpl-list"></div><div id="templates-modal" class="hidden"></div><div id="toast"></div>';
    applyTemplate('tp');
    const t = Object.values(state.tasks)[0];
    expect(t.everyWeeks).toBe(2); expect(t.weekAnchor).toBe('2026-11-09');
  });
  it('chore file round trip validates and anchors on upload', () => {
    const file = buildChoreFile({ a: bins({ id: 'a' }) });
    expect(file.chores[0].everyWeeks).toBe(2); expect(file.chores[0]).not.toHaveProperty('weekAnchor');
    const mk = (n, extra = {}) => ({ name: 'N' + n, freq: 'weekdays', days: [2], everyWeeks: n, ...extra });
    const v = validateChoreFile(JSON.stringify({ ...file, chores: [mk(3), mk(1, { name: 'One' }), mk(7, { name: 'Seven' }), { name: 'W', freq: 'weekly', everyWeeks: 2 }] }), {});
    expect(v.ok).toBe(true);
    const byName = Object.fromEntries(v.chores.map(c => [c.name, c]));
    expect(byName.N3.everyWeeks).toBe(3);
    for (const k of ['One', 'Seven', 'W']) expect(byName[k] || {}).not.toHaveProperty('everyWeeks');
    const { paths } = addPayload([byName.N3], 1, at('2026-11-10T09:00:00'));
    expect(Object.values(paths).find(x => x && x.name === 'N3').weekAnchor).toBe('2026-11-09');
  });
});

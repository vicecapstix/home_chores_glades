import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn(), patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn().mockResolvedValue(undefined), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot, patchPaths, writeState } from '../src/firebase.js';
import * as ui from '../src/ui.js';
import { checkTaskResets, addTask, saveTask, skipTask } from '../src/tasks.js';
import { dueStatus, taskPoints, freqDays, freqLabel, validInterval, initialLastDone } from '../src/utils.js';
import { computeResumePatch } from '../src/pause.js';

const DAY = 86400000;
const NOW = new Date(2026, 9, 14, 12).getTime();
const mk = (o = {}) => ({ id: 'a', name: 'Plants', freq: 'interval', intervalDays: 3, done: true, lastDone: NOW, lastDoneBy: 'Ann', person: 'Ann', difficulty: 'easy', ...o });
const admin = () => true;

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.pause = null; state.tasks = {}; state.templates = {}; state.nextId = 1;
  state.members = { Ann: { name: 'Ann', role: 'admin' }, Bo: { name: 'Bo', role: 'member' } };
});
afterEach(() => vi.useRealTimers());

describe('validInterval', () => {
  it('accepts whole numbers 2-60 (numbers or numeric strings)', () => {
    expect(validInterval(2)).toBe(2); expect(validInterval('45')).toBe(45); expect(validInterval(60)).toBe(60);
  });
  it('rejects out-of-range, fractional and junk values', () => {
    for (const v of [0, 1, 61, -3, 2.5, '', 'abc', null, undefined, NaN, '3.5']) expect(validInterval(v)).toBe(0);
  });
});

describe('freqDays / label', () => {
  it('reads intervalDays from a task and falls back to 7 when invalid', () => {
    expect(freqDays(mk({ intervalDays: 10 }))).toBe(10);
    expect(freqDays(mk({ intervalDays: 99 }))).toBe(7);
    expect(freqDays('weekly')).toBe(7);
    expect(freqDays({ freq: 'monthly' })).toBe(30);
  });
  it('labels "Every 3 days"', () => { expect(freqLabel(mk())).toBe('Every 3 days'); });
});

describe('reset at N-1 / N / N+1 days', () => {
  const reset = ago => { state.tasks = { a: mk({ lastDone: NOW - ago * DAY }) }; checkTaskResets(); return state.tasks.a.done; };
  it('stays done at N-1', () => { expect(reset(2)).toBe(true); expect(patchRoot).not.toHaveBeenCalled(); });
  it('resets at N', () => { expect(reset(3)).toBe(false); expect(patchRoot).toHaveBeenCalledTimes(1); });
  it('resets at N+1', () => { expect(reset(4)).toBe(false); });
});

describe('dueStatus at N-1 / N / N+1 days', () => {
  const st = ago => dueStatus(mk({ done: false, lastDone: NOW - ago * DAY }), NOW);
  it('ok well before, soon at N-1, overdue at N and N+1', () => {
    expect(st(1)).toBe('ok'); expect(st(2)).toBe('soon'); expect(st(3)).toBe('overdue'); expect(st(4)).toBe('overdue');
  });
  it('honours dueTime on the due day', () => {
    const t = mk({ done: false, lastDone: NOW - 3 * DAY, dueTime: '18:00' });
    expect(dueStatus(t, NOW)).toBe('soon'); // due today 18:00, not yet
    expect(dueStatus(t, NOW + 7 * 3600000)).toBe('overdue');
  });
  it('a paused household is ok, a skipped occurrence is ok', () => {
    expect(dueStatus(mk({ done: false, lastDone: NOW - 5 * DAY, skippedAt: NOW - 5 * DAY }), NOW)).toBe('overdue');
    expect(dueStatus(mk({ done: false, lastDone: NOW - DAY, skippedAt: NOW - DAY }), NOW)).toBe('ok');
  });
});

describe('taskPoints mapping', () => {
  const pts = n => taskPoints(mk({ intervalDays: n }));
  it('<=2 =1, <=7 =3, <=14 =5, else 8', () => {
    expect([2, 3, 7, 8, 14, 15, 45, 60].map(pts)).toEqual([1, 3, 3, 5, 5, 8, 8, 8]);
  });
  it('multiplies by difficulty', () => { expect(taskPoints(mk({ intervalDays: 10, difficulty: 'hard' }))).toBe(15); });
});

describe('skip and pause', () => {
  it('skip works on interval chores', async () => {
    state.tasks = { a: mk({ done: false, lastDone: NOW - 5 * DAY }) };
    await skipTask('a', admin);
    expect(state.tasks.a.skippedAt).toBe(NOW);
  });
  it('pause resume shifts lastDone for interval chores', () => {
    const patch = computeResumePatch({ since: NOW - 4 * DAY }, { a: mk({ done: false, lastDone: NOW - 6 * DAY }) }, {}, NOW);
    expect(patch['tasks/a/lastDone']).toBe(NOW - 2 * DAY);
  });
});

describe('initialLastDone', () => {
  it('starts a new interval chore due now using its own N', () => {
    expect(initialLastDone({ freq: 'interval', intervalDays: 10 }, NOW)).toBe(new Date(2026, 9, 4, 12).getTime());
    expect(initialLastDone('weekly', NOW)).toBe(new Date(2026, 9, 7, 12).getTime());
  });
});

describe('templates round trip', () => {
  beforeEach(() => {
    document.body.innerHTML = '<input id="tpl-name-input" value="T"><div id="tpl-list"></div><div id="templates-modal" class="hidden"></div><div id="toast"></div>';
  });
  it('saves intervalDays and applies it', () => {
    state.tasks = { a: mk({ intervalDays: 45 }), b: { id: 'b', name: 'D', freq: 'daily' } };
    ui.saveTemplate();
    const tpl = Object.values(state.templates)[0];
    expect(tpl.tasks[0]).toMatchObject({ freq: 'interval', intervalDays: 45 });
    expect(tpl.tasks[1].intervalDays).toBeUndefined();
    state.tasks = {};
    ui.applyTemplate(tpl.id);
    const t = Object.values(state.tasks).find(x => x.freq === 'interval');
    expect(t.intervalDays).toBe(45);
    expect(freqDays(t)).toBe(45);
    expect(t.lastDone).toBe(initialLastDone({ freq: 'interval', intervalDays: 45 }, NOW));
    expect(patchPaths).toHaveBeenCalled();
  });
  it('a template with an invalid interval falls back to 7', () => {
    state.templates = { x: { id: 'x', name: 'X', tasks: [{ name: 'Z', freq: 'interval', intervalDays: 500 }] } };
    ui.applyTemplate('x');
    expect(Object.values(state.tasks)[0].intervalDays).toBe(7);
  });
});

describe('add / edit form validation', () => {
  const addDom = (n) => {
    document.body.innerHTML = '<input id="new-task" value="Kettle"><select id="new-freq"><option value="interval" selected>i</option><option value="weekly">w</option></select>' +
      '<input id="new-interval" value="' + n + '"><select id="new-person"><option value="">Anyone</option></select><select id="new-diff"><option>easy</option></select>' +
      '<select id="new-cat"><option value=""></option></select><input id="new-duedate"><input id="new-duetime"><textarea id="new-notes"></textarea>' +
      '<div id="new-days" class="day-chips"></div><div id="toast"></div>';
  };
  it('addTask rejects invalid N and writes nothing', async () => {
    for (const n of ['1', '61', '2.5', '']) {
      addDom(n); await addTask(admin);
    }
    expect(Object.keys(state.tasks)).toHaveLength(0);
    expect(patchPaths).not.toHaveBeenCalled();
  });
  it('addTask stores intervalDays for valid N', async () => {
    addDom('45'); await addTask(admin);
    const t = Object.values(state.tasks)[0];
    expect(t).toMatchObject({ freq: 'interval', intervalDays: 45 });
    expect(t.lastDone).toBe(initialLastDone({ freq: 'interval', intervalDays: 45 }, NOW));
    expect(patchPaths).toHaveBeenCalledTimes(1);
  });
  it('saveTask rejects invalid N, stores valid N, and drops it when switching away', async () => {
    state.tasks = { a: mk({ done: false }) };
    const card = (freq, n) => {
      document.body.innerHTML = '<div id="tc-a" class="task-card editing"><input class="edit-name" value="Plants"><select class="edit-freq"><option value="' + freq + '" selected></option></select>' +
        '<input class="edit-interval" value="' + n + '"><div class="edit-days"></div><input class="edit-duedate"><input class="edit-duetime"><select class="edit-diff"><option>easy</option></select>' +
        '<select class="edit-cat"><option value=""></option></select><select class="edit-person"><option value="Ann">Ann</option></select><textarea class="edit-notes"></textarea></div><div id="toast"></div>';
    };
    card('interval', '0'); await saveTask('a', admin);
    expect(patchPaths).not.toHaveBeenCalled(); expect(state.tasks.a.intervalDays).toBe(3);
    card('interval', '12'); await saveTask('a', admin);
    expect(state.tasks.a.intervalDays).toBe(12);
    card('weekly', '12'); await saveTask('a', admin);
    expect(state.tasks.a.intervalDays).toBeUndefined();
  });
});

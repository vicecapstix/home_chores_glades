// #358: optional per-chore time estimate (minutes, whole number 1-180). Display only.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

const cfg = vi.hoisted(() => ({ ro: false }));
vi.mock('../src/config.js', async orig => ({ ...(await orig()), get READONLY() { return cfg.ro; } }));
vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined),
  patchTask: vi.fn(async (id, f) => { Object.assign(state.tasks[id], f); }),
  patchMember: vi.fn(async (n, f) => { Object.assign(state.members[n], f); }),
  patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn(async f => { Object.assign(state, f); }),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
  removeHistoryEntry: vi.fn(async m => {
    const h = state.history || [];
    const idx = h.findIndex(e => e.completedAt === m.completedAt);
    if (idx < 0) return { ok: false, removed: false, rest: h };
    state.history = h.filter((_, i) => i !== idx);
    return { ok: true, removed: true, rest: state.history };
  }),
  appendHistory: vi.fn(async e => { state.history = (state.history || []).concat([e]).slice(-500); return { ok: true }; }),
  adjustMemberPoints: vi.fn(async (n, o) => { const m = state.members[n]; m.points += o.pts; m.completedCount = Math.max(0, m.completedCount + o.count); return { ok: true }; }),
}));
vi.mock('../src/ui.js', async orig => ({ ...(await orig()), showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchPaths } from '../src/firebase.js';
import { taskPoints, validMinutes, minutesLabel, weekPlan } from '../src/utils.js';
import { addTask, saveTask, toggleTask } from '../src/tasks.js';
import { cardHTML } from '../src/render.js';
import { weekHTML } from '../src/week.js';
import { templateTask, applyTemplate } from '../src/ui.js';
import { buildChoreFile, validateChoreFile, addPayload } from '../src/chorefile.js';

const NOW = new Date('2026-05-13T12:00:00').getTime();
const base = { id: 't1', name: 'Wash car', freq: 'weekly', difficulty: 'easy', person: 'Al', done: false, lastDone: NOW - 9 * 86400000, subtasks: {} };
const admin = () => true, notAdmin = () => false;

beforeEach(() => {
  vi.clearAllMocks(); cfg.ro = false;
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.members = { Al: { name: 'Al', role: 'admin', points: 10, weekPoints: 0, weekStart: '2026-05-11', completedCount: 0, streak: 0, badges: [] } };
  state.tasks = { t1: { ...base } }; state.history = []; state.templates = {}; state.nextId = 1; state.doublePoints = null;
  document.body.innerHTML = '<div id="toast"></div>';
});
afterEach(() => vi.useRealTimers());


describe('validation helper (AC4)', () => {
  it('accepts whole minutes 1-180 only', () => {
    expect(validMinutes(15)).toBe(15); expect(validMinutes('20')).toBe(20); expect(validMinutes(180)).toBe(180); expect(validMinutes(1)).toBe(1);
    for (const v of [0, 181, -1, 2.5, NaN, 'x', '', null, undefined, {}, [3]]) expect(validMinutes(v)).toBe(0);
  });
  it('label ignores invalid stored values and never changes points', () => {
    expect(minutesLabel({ minutes: 15 })).toBe('~15 min');
    for (const v of ['15', 999, 0, null]) expect(minutesLabel({ minutes: v })).toBe('');
    expect(taskPoints({ ...base, minutes: 90 })).toBe(taskPoints(base));
  });
});

describe('add and edit (AC1)', () => {
  function form(v) {
    document.body.innerHTML = '<div id="toast"></div><input id="new-task" value="Feed cat"><select id="new-freq"><option value="daily" selected>d</option></select>' +
      '<select id="new-person"><option value="" selected></option></select><select id="new-diff"><option value="easy" selected></option></select>' +
      '<select id="new-cat"><option value="" selected></option></select><input id="new-duedate" value=""><div id="new-days" class="hidden"></div><textarea id="new-notes"></textarea>' +
      '<input id="new-minutes" value="' + v + '">';
  }
  it('admin add saves valid minutes; blank or invalid omits it', async () => {
    form('15'); await addTask(admin); vi.advanceTimersByTime(5);
    form(''); await addTask(admin); vi.advanceTimersByTime(5);
    form('999'); await addTask(admin);
    const ts = Object.values(state.tasks).filter(t => t.name === 'Feed cat');
    expect(ts[0].minutes).toBe(15);
    expect(ts[1]).not.toHaveProperty('minutes');
    expect(ts[2]).not.toHaveProperty('minutes');
  });
  it('non-admin and READONLY add write nothing', async () => {
    form('15'); await addTask(notAdmin);
    cfg.ro = true; await addTask(admin);
    expect(patchPaths).not.toHaveBeenCalled();
    expect(state.tasks).toEqual({ t1: { ...base } });
  });
  function editCard(v) {
    document.body.innerHTML = '<div id="tc-t1"><input class="edit-name" value="Wash car"><select class="edit-freq"><option value="weekly" selected></option></select>' +
      '<div class="edit-days"></div><input class="edit-interval"><input class="edit-duedate"><input class="edit-duetime"><select class="edit-diff"><option value="easy" selected></option></select>' +
      '<select class="edit-cat"><option value="" selected></option></select><select class="edit-person"><option value="Al" selected></option></select>' +
      '<textarea class="edit-notes"></textarea><input class="edit-minutes" value="' + v + '"></div>';
  }
  it('saveTask writes minutes, clears when blank, ignores bad values', async () => {
    editCard('25'); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[0][0]['tasks/t1/minutes']).toBe(25);
    editCard(''); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[1][0]['tasks/t1/minutes']).toBeNull();
    editCard('0'); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[2][0]['tasks/t1/minutes']).toBeNull();
  });
  it('non-admin and READONLY edit write nothing', async () => {
    editCard('25'); await saveTask('t1', notAdmin);
    cfg.ro = true; await saveTask('t1', admin);
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('card and This week (AC2)', () => {
  it('card shows ~N min only when valid', () => {
    expect(cardHTML({ ...base, minutes: 15 })).toContain('~15 min');
    expect(cardHTML({ ...base, minutes: 999 })).not.toContain('min</span>');
    expect(cardHTML(base)).not.toContain('~');
  });
  it('weekPlan totals minutes per person per day; weekHTML shows them', () => {
    const tasks = {
      a: { ...base, id: 'a', name: 'A', freq: 'daily', minutes: 10 },
      b: { ...base, id: 'b', name: 'B', freq: 'daily', minutes: 5 },
      c: { ...base, id: 'c', name: 'C', freq: 'daily', person: '', minutes: 7 },
      d: { ...base, id: 'd', name: 'D', freq: 'daily', minutes: 500 },
    };
    const days = weekPlan(tasks, NOW);
    expect(days[0].minutes).toEqual({ Al: 15, '': 7 });
    const html = weekHTML(tasks, NOW);
    expect(html).toContain('Al 15 min');
    expect(html).toContain('Anyone 7 min');
    expect(html).toContain('~10 min');
    expect(html).not.toContain('500');
    expect(weekHTML({ x: { ...base, freq: 'daily' } }, NOW)).not.toContain('wk-mins');
  });
});

describe('templates and chore files keep it (AC3)', () => {
  it('template round trip', () => {
    expect(templateTask({ ...base, minutes: 12 }).minutes).toBe(12);
    expect(templateTask({ ...base, minutes: 999 })).not.toHaveProperty('minutes');
    state.templates = { tp: { id: 'tp', name: 'T', tasks: [{ name: 'X', freq: 'daily', minutes: 4 }, { name: 'Y', freq: 'daily', minutes: 500 }] } };
    document.body.innerHTML = '<div id="tpl-list"></div><div id="templates-modal" class="hidden"></div><div id="toast"></div>';
    state.tasks = {}; applyTemplate('tp');
    const t = Object.values(state.tasks);
    expect(t.find(x => x.name === 'X').minutes).toBe(4);
    expect(t.find(x => x.name === 'Y')).not.toHaveProperty('minutes');
  });
  it('chore file download keeps it and upload validates it', () => {
    const file = buildChoreFile({ a: { ...base, id: 'a', minutes: 9 }, b: { ...base, id: 'b', name: 'Other' } });
    expect(file.chores.find(c => c.name === 'Wash car').minutes).toBe(9);
    expect(file.chores.find(c => c.name === 'Other')).not.toHaveProperty('minutes');
    const v = validateChoreFile(JSON.stringify({ ...file, chores: [{ name: 'N1', freq: 'daily', minutes: 5 }, { name: 'N2', freq: 'daily', minutes: 'long' }] }), {});
    expect(v.ok).toBe(true);
    expect(v.chores.find(c => c.name === 'N1').minutes).toBe(5);
    expect(v.chores.find(c => c.name === 'N2')).not.toHaveProperty('minutes');
  });
  it('an uploaded chore with minutes becomes a task that keeps it', () => {
    const { paths } = addPayload([{ name: 'N1', freq: 'daily', difficulty: 'easy', category: '', notes: '', subtasks: [], minutes: 5 }, { name: 'N2', freq: 'daily', difficulty: 'easy', category: '', notes: '', subtasks: [] }], 1, NOW);
    const ts = Object.entries(paths).filter(([k]) => k.startsWith('tasks/')).map(([, t]) => t);
    expect(ts.find(t => t.name === 'N1').minutes).toBe(5);
    expect(ts.find(t => t.name === 'N2')).not.toHaveProperty('minutes');
  });
});

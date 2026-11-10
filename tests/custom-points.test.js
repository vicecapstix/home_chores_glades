// #313: optional per-chore points override (pointsOverride, whole number 1-50).
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
import { taskPoints, validPoints } from '../src/utils.js';
import { addTask, saveTask, toggleTask } from '../src/tasks.js';
import { cardHTML } from '../src/render.js';
import { templateTask, applyTemplate } from '../src/ui.js';
import { buildChoreFile, validateChoreFile } from '../src/chorefile.js';

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

describe('taskPoints with an override (AC2)', () => {
  it('uses the override instead of freq x difficulty', () => {
    expect(taskPoints({ ...base })).toBe(3);
    expect(taskPoints({ ...base, pointsOverride: 10 })).toBe(10);
    expect(taskPoints({ ...base, freq: 'daily', difficulty: 'hard', pointsOverride: 1 })).toBe(1);
  });
  it('ignores invalid or out-of-range values', () => {
    for (const v of [0, 51, -2, 2.5, NaN, '12', 'x', null, undefined, {}, [3]]) expect(taskPoints({ ...base, pointsOverride: v })).toBe(3);
    expect(validPoints('12')).toBe(12);
    expect(validPoints(50)).toBe(50);
    expect(validPoints('')).toBe(0);
  });
});

describe('add and edit (AC1, AC5)', () => {
  function form(v) {
    document.body.innerHTML = '<div id="toast"></div><input id="new-task" value="Feed cat"><select id="new-freq"><option value="daily" selected>d</option></select>' +
      '<select id="new-person"><option value="" selected></option></select><select id="new-diff"><option value="easy" selected></option></select>' +
      '<select id="new-cat"><option value="" selected></option></select><input id="new-duedate" value=""><div id="new-days" class="hidden"></div><textarea id="new-notes"></textarea>' +
      '<input id="new-points" value="' + v + '">';
  }
  it('admin add saves a valid override; blank or invalid omits it', async () => {
    form('10'); await addTask(admin); vi.advanceTimersByTime(5); // distinct task ids
    form(''); await addTask(admin); vi.advanceTimersByTime(5);
    form('99'); await addTask(admin);
    const ts = Object.values(state.tasks).filter(t => t.name === 'Feed cat');
    expect(ts[0].pointsOverride).toBe(10);
    expect(ts[1]).not.toHaveProperty('pointsOverride');
    expect(ts[2]).not.toHaveProperty('pointsOverride');
  });
  it('non-admin and READONLY add write nothing', async () => {
    form('10'); await addTask(notAdmin);
    cfg.ro = true; await addTask(admin);
    expect(patchPaths).not.toHaveBeenCalled();
    expect(state.tasks).toEqual({ t1: { ...base } });
  });
  function editCard(v) {
    document.body.innerHTML = '<div id="tc-t1"><input class="edit-name" value="Wash car"><select class="edit-freq"><option value="weekly" selected></option></select>' +
      '<div class="edit-days"></div><input class="edit-interval"><input class="edit-duedate"><input class="edit-duetime"><select class="edit-diff"><option value="easy" selected></option></select>' +
      '<select class="edit-cat"><option value="" selected></option></select><select class="edit-person"><option value="Al" selected></option></select>' +
      '<textarea class="edit-notes"></textarea><input class="edit-points" value="' + v + '"></div>';
  }
  it('saveTask writes the override, clears it when blank, ignores bad values', async () => {
    editCard('7'); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[0][0]['tasks/t1/pointsOverride']).toBe(7);
    editCard(''); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[1][0]['tasks/t1/pointsOverride']).toBeNull();
    editCard('0'); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[2][0]['tasks/t1/pointsOverride']).toBeNull();
  });
  it('non-admin and READONLY edit write nothing', async () => {
    editCard('7'); await saveTask('t1', notAdmin);
    cfg.ro = true; await saveTask('t1', admin);
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('same value everywhere (AC3)', () => {
  it('card shows the override, times a double-points day', () => {
    state.tasks.t1.pointsOverride = 10;
    expect(cardHTML(state.tasks.t1)).toContain('+10 pts');
    state.doublePoints = { date: '2026-05-13', mult: 2 };
    expect(cardHTML(state.tasks.t1)).toContain('+20 pts');
  });
  it('tick awards the override into points and history; uncheck reverses it', async () => {
    state.tasks.t1.pointsOverride = 10;
    await toggleTask('t1', () => 'Al', admin);
    expect(state.members.Al.points).toBe(20);
    expect(state.history.at(-1).points).toBe(10);
    await toggleTask('t1', () => 'Al', admin);
    expect(state.members.Al.points).toBe(10);
    expect(state.history).toHaveLength(0);
  });
});

describe('templates and chore files keep it (AC4)', () => {
  it('template round trip', () => {
    expect(templateTask({ ...base, pointsOverride: 12 }).pointsOverride).toBe(12);
    expect(templateTask({ ...base, pointsOverride: 99 })).not.toHaveProperty('pointsOverride');
    state.templates = { tp: { id: 'tp', name: 'T', tasks: [{ name: 'X', freq: 'daily', pointsOverride: 4 }, { name: 'Y', freq: 'daily', pointsOverride: 500 }] } };
    document.body.innerHTML = '<div id="tpl-list"></div><div id="templates-modal" class="hidden"></div><div id="toast"></div>';
    state.tasks = {}; applyTemplate('tp');
    const t = Object.values(state.tasks);
    expect(t.find(x => x.name === 'X').pointsOverride).toBe(4);
    expect(t.find(x => x.name === 'Y')).not.toHaveProperty('pointsOverride');
  });
  it('chore file download keeps it and upload validates it', () => {
    const file = buildChoreFile({ a: { ...base, id: 'a', pointsOverride: 9 }, b: { ...base, id: 'b', name: 'Other' } });
    expect(file.chores.find(c => c.name === 'Wash car').pointsOverride).toBe(9);
    expect(file.chores.find(c => c.name === 'Other')).not.toHaveProperty('pointsOverride');
    const v = validateChoreFile(JSON.stringify({ ...file, chores: [{ name: 'N1', freq: 'daily', pointsOverride: 5 }, { name: 'N2', freq: 'daily', pointsOverride: 'big' }] }), {});
    expect(v.ok).toBe(true);
    expect(v.chores.find(c => c.name === 'N1').pointsOverride).toBe(5);
    expect(v.chores.find(c => c.name === 'N2')).not.toHaveProperty('pointsOverride');
  });
});

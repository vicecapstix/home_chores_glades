import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn(), patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn().mockResolvedValue(undefined), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchPaths } from '../src/firebase.js';
import { cardHTML } from '../src/render.js';
import { addTask, saveTask } from '../src/tasks.js';
import { templateTask, applyTemplate } from '../src/ui.js';
import { iconPrefix, CHORE_ICONS } from '../src/utils.js';
import { buildChoreFile, validateChoreFile, addPayload } from '../src/chorefile.js';
import { weekHTML } from '../src/week.js';

const base = { id: 't1', name: 'Dishes', freq: 'daily', difficulty: 'easy', person: '', done: false, lastDone: 1, subtasks: {} };
const admin = () => true, notAdmin = () => false;

beforeEach(() => {
  vi.clearAllMocks();
  state.members = { Ann: { name: 'Ann', role: 'admin' } }; state.tasks = {}; state.templates = {}; state.nextId = 1;
  document.body.innerHTML = '<div id="toast"></div>';
});

describe('icon only from the fixed list (#257)', () => {
  it('cardHTML shows a listed icon before the name', () => {
    expect(cardHTML({ ...base, icon: '🧹' })).toContain('<span class="task-name">🧹 Dishes');
  });
  it('ignores and never renders a value outside the list (no XSS)', () => {
    const html = cardHTML({ ...base, icon: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('onerror');
    expect(html).toContain('<span class="task-name">Dishes');
    expect(iconPrefix({ icon: 'x' })).toBe('');
  });
  it('This week planner shows the icon and ignores unlisted values', () => {
    const now = new Date(2026, 10, 5, 12).getTime();
    const html = weekHTML({ t1: { ...base, icon: '🐶' }, t2: { ...base, id: 't2', name: 'Bad', icon: '<b>x</b>' } }, now);
    expect(html).toContain('🐶 Dishes');
    expect(html).not.toContain('<b>x</b>');
  });
});

describe('add and edit (#257)', () => {
  function form(icon) {
    document.body.innerHTML = '<div id="toast"></div><input id="new-task" value="Walk dog"><select id="new-freq"><option value="weekly" selected>w</option></select>' +
      '<select id="new-person"><option value="" selected></option></select><select id="new-diff"><option value="easy" selected></option></select>' +
      '<select id="new-cat"><option value="" selected></option></select><input id="new-duedate" value=""><div id="new-days" class="hidden"></div><textarea id="new-notes"></textarea>' +
      '<select id="new-icon"><option value="">none</option><option>🐶</option><option>zzz</option></select>';
    document.getElementById('new-icon').value = icon;
  }
  it('admin add saves the chosen icon', async () => {
    form('🐶'); await addTask(admin);
    expect(Object.values(state.tasks)[0].icon).toBe('🐶');
  });
  it('add ignores a value outside the list', async () => {
    form('zzz'); await addTask(admin);
    expect(Object.values(state.tasks)[0].icon).toBeUndefined();
  });
  it('non-admin add writes nothing', async () => {
    form('🐶'); await addTask(notAdmin);
    expect(patchPaths).not.toHaveBeenCalled(); expect(state.tasks).toEqual({});
  });
  function editCard(icon) {
    state.tasks.t1 = { ...base, icon: '🧹' };
    document.body.innerHTML = '<div id="tc-t1"><input class="edit-name" value="Dishes"><select class="edit-freq"><option value="daily" selected></option></select>' +
      '<div class="edit-days"></div><input class="edit-interval"><input class="edit-duedate"><input class="edit-duetime"><select class="edit-diff"><option value="easy" selected></option></select>' +
      '<select class="edit-icon"><option value="">n</option><option>🧹</option><option>🚗</option><option>bad</option></select><select class="edit-cat"><option value="" selected></option></select>' +
      '<select class="edit-person"><option value="" selected></option></select><textarea class="edit-notes"></textarea></div>';
    document.querySelector('.edit-icon').value = icon;
  }
  it('saveTask writes the new icon and clears it when none is picked', async () => {
    editCard('🚗'); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[0][0]['tasks/t1/icon']).toBe('🚗');
    editCard(''); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[1][0]['tasks/t1/icon']).toBeNull();
  });
  it('saveTask rejects an unlisted value and non-admin writes nothing', async () => {
    editCard('bad'); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[0][0]['tasks/t1/icon']).toBeNull();
    patchPaths.mockClear(); editCard('🚗'); await saveTask('t1', notAdmin);
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('templates, chore files keep the icon (#257)', () => {
  it('template round trip keeps a listed icon and drops others', () => {
    expect(templateTask({ ...base, icon: '🌱' }).icon).toBe('🌱');
    expect(templateTask({ ...base, icon: 'bad' }).icon).toBeUndefined();
    state.templates = { tp: { id: 'tp', name: 'T', tasks: [{ name: 'X', freq: 'daily', icon: '🛏️' }, { name: 'Y', freq: 'daily', icon: '<i>' }] } };
    document.body.innerHTML = '<div id="tpl-list"></div><div id="templates-modal" class="hidden"></div><div id="toast"></div>';
    applyTemplate('tp');
    const t = Object.values(state.tasks);
    expect(t.find(x => x.name === 'X').icon).toBe('🛏️');
    expect(t.find(x => x.name === 'Y').icon).toBeUndefined();
  });
  it('chore file download/upload round trip', () => {
    const file = buildChoreFile({ a: { ...base, id: 'a', icon: '🚗' }, b: { ...base, id: 'b', name: 'Other' } });
    expect(file.chores.find(c => c.name === 'Dishes').icon).toBe('🚗');
    expect(file.chores.find(c => c.name === 'Other').icon).toBeUndefined();
    const v = validateChoreFile(JSON.stringify({ ...file, chores: [{ name: 'New', freq: 'daily', icon: '🚗' }, { name: 'New2', freq: 'daily', icon: 'bad' }] }), {});
    expect(v.ok).toBe(true);
    const paths = addPayload(v.chores || v.clean || [], 1, 1000).paths;
    const icons = Object.values(paths).filter(x => x && x.name).map(x => x.icon);
    expect(icons).toEqual(['🚗', undefined]);
  });
  it('list holds the 12 documented emoji', () => { expect(CHORE_ICONS).toHaveLength(12); });
});

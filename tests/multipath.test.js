import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

let admin = true;
vi.mock('../src/auth.js', () => ({ isAdmin: () => admin }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined),
  patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(), adjustMemberPoints: vi.fn(),
}));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { writeState, patchPaths } from '../src/firebase.js';
import { addTask, saveTask, editTask } from '../src/tasks.js';
import { addMember, removeMember } from '../src/members.js';
import { applyTemplate } from '../src/ui.js';
import { initRender, toggleSelectMode, toggleSelect, bulkAssign } from '../src/render.js';

const isAdmin = () => admin;
const keys = () => Object.keys(patchPaths.mock.calls[0][0]).sort();

beforeEach(() => {
  vi.clearAllMocks();
  admin = true;
  vi.stubGlobal('confirm', vi.fn(() => true));
  state.members = { Ann: { name: 'Ann', role: 'admin' }, Bo: { name: 'Bo', role: 'member' } };
  state.tasks = {};
  state.history = [{ taskId: 'x' }];
  state.nextId = 5;
  state.templates = {};
  state.redemptions = {};
});

describe('addTask', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<input id="new-task" value="Bins" /><select id="new-freq"><option value="weekly" selected>w</option></select>' +
      '<select id="new-person"><option value=""></option></select><select id="new-diff"><option value="easy">e</option></select><select id="new-cat"><option value=""></option></select>' +
      '<input id="new-duedate" /><textarea id="new-notes"></textarea><div id="new-days" class="day-chips"></div>';
  });
  it('writes only tasks/<id> and nextId', async () => {
    await addTask(isAdmin);
    const id = Object.keys(state.tasks)[0];
    expect(keys()).toEqual(['nextId', 'tasks/' + id].sort());
    expect(patchPaths.mock.calls[0][0].nextId).toBe(6);
    expect(writeState).not.toHaveBeenCalled();
  });
  it('writes nothing for non-admin', async () => {
    admin = false;
    await addTask(isAdmin);
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('saveTask', () => {
  it('writes only that task\'s editable fields', async () => {
    state.tasks.a = { id: 'a', name: 'Dishes', freq: 'daily', person: 'Ann', done: false, lastDone: 0, difficulty: 'easy', category: '', notes: '', dueDate: '' };
    document.body.innerHTML = '<div id="tc-a" class="task-card"></div>';
    editTask('a', isAdmin);
    document.querySelector('.edit-name').value = 'Dishes 2';
    await saveTask('a', isAdmin);
    const paths = patchPaths.mock.calls[0][0];
    expect(Object.keys(paths).every(k => k.startsWith('tasks/a/'))).toBe(true);
    expect(paths['tasks/a/name']).toBe('Dishes 2');
    expect(paths['tasks/a/days']).toBeNull();
    expect(paths['tasks/a/rotation']).toBeNull();
    expect(writeState).not.toHaveBeenCalled();
  });
});

describe('addMember', () => {
  it('writes only members/<name>', async () => {
    document.body.innerHTML = '<input id="new-member" value="Cy" />';
    await addMember(isAdmin);
    expect(keys()).toEqual(['members/Cy']);
    expect(writeState).not.toHaveBeenCalled();
  });
});

describe('removeMember', () => {
  it('nulls the member and touches only affected tasks and pending redemptions', async () => {
    state.tasks = {
      a: { id: 'a', name: 'A', person: 'Bo', freq: 'daily' },
      b: { id: 'b', name: 'B', person: 'Ann', freq: 'daily' },
      c: { id: 'c', name: 'C', person: 'Ann', freq: 'daily', rotation: ['Ann', 'Bo', 'Cy'] },
    };
    state.redemptions = { r1: { member: 'Bo', status: 'pending' }, r2: { member: 'Bo', status: 'approved' }, r3: { member: 'Ann', status: 'pending' } };
    await removeMember('Bo', isAdmin);
    expect(patchPaths.mock.calls[0][0]).toEqual({
      'members/Bo': null, 'tasks/a/person': '', 'tasks/c/rotation': ['Ann', 'Cy'], 'redemptions/r1': null,
    });
    expect(writeState).not.toHaveBeenCalled();
  });
});

describe('bulkAssign', () => {
  it('writes only person of selected tasks', async () => {
    state.tasks = { a: { id: 'a', name: 'A', person: '' }, b: { id: 'b', name: 'B', person: '' } };
    document.body.innerHTML = '<select id="bulk-person"><option value="Bo" selected>Bo</option></select><div id="bulk-bar"></div><span id="bulk-count"></span><div id="toast"></div><div id="task-list"></div>';
    initRender(isAdmin, () => 'Ann');
    toggleSelectMode();
    toggleSelect('a');
    await bulkAssign();
    expect(patchPaths.mock.calls[0][0]).toEqual({ 'tasks/a/person': 'Bo' });
    expect(writeState).not.toHaveBeenCalled();
  });
});

describe('applyTemplate', () => {
  it('writes only the new tasks and nextId', () => {
    state.templates = { tp: { id: 'tp', name: 'T', tasks: [{ name: 'X', freq: 'daily' }, { name: 'Y', freq: 'weekly' }] } };
    document.body.innerHTML = '<div id="toast"></div><div id="tpl-list"></div>';
    applyTemplate('tp');
    const ids = Object.keys(state.tasks).map(i => 'tasks/' + i);
    expect(keys()).toEqual([...ids, 'nextId'].sort());
    expect(patchPaths.mock.calls[0][0].nextId).toBe(7);
    expect(writeState).not.toHaveBeenCalled();
  });
});

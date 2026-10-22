import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn().mockResolvedValue(undefined), restoreTask: vi.fn().mockResolvedValue(undefined),
  patchSubtask: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));

import { writeState, patchPaths, patchSubtask, patchRoot, patchMember, removeTask } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { addSubtask, removeSubtask, toggleSubtask, claimTask, moveTask } from '../src/tasks.js';
import { removeMember, toggleRole } from '../src/members.js';
import { initRender, bulkAssign, bulkDelete, toggleSelect, toggleSelectMode } from '../src/render.js';

const admin = () => true, notAdmin = () => false;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('confirm', vi.fn(() => true));
  state.members = {
    Alice: { name: 'Alice', role: 'admin' }, Bob: { name: 'Bob', role: 'member' },
  };
  state.tasks = {
    t1: { id: 't1', name: 'A', person: '', order: 1, done: false, subtasks: { s1: { id: 's1', name: 'x', done: false } } },
    t2: { id: 't2', name: 'B', person: 'Bob', order: 2, done: false },
  };
  document.body.innerHTML =
    '<div id="task-list"><div class="task-card" data-id="t1" id="tc-t1"><div class="subtask-add"><input value="new" /></div></div>' +
    '<div class="task-card" data-id="t2"></div></div><select id="bulk-person"><option value="Bob">Bob</option></select><span id="bulk-count"></span><div id="bulk-bar"></div><div id="filters"></div>';
});

describe('subtasks', () => {
  it('addSubtask / removeSubtask are admin-only', async () => {
    await addSubtask('t1', notAdmin);
    await removeSubtask('t1', 's1', notAdmin);
    expect(writeState).not.toHaveBeenCalled();
    expect(Object.keys(state.tasks.t1.subtasks)).toEqual(['s1']);
    await addSubtask('t1', admin);
    expect(patchSubtask).toHaveBeenCalledTimes(1);
    await removeSubtask('t1', 's1', admin);
    expect(patchRoot).toHaveBeenCalledWith({ 'tasks/t1/subtasks/s1': null });
    expect(state.tasks.t1.subtasks.s1).toBeUndefined();
  });
  it('toggleSubtask stays allowed for members', async () => {
    await toggleSubtask('t1', 's1', () => 'Bob', notAdmin);
    expect(patchSubtask).toHaveBeenCalledWith('t1', 's1', { done: true });
  });
});

describe('claimTask', () => {
  it('no-ops with a toast if the task is already assigned', async () => {
    await claimTask('t2', () => 'Alice');
    expect(state.tasks.t2.person).toBe('Bob');
    expect(writeState).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });
  it('still claims an unassigned task', async () => {
    await claimTask('t1', () => 'Bob');
    expect(state.tasks.t1.person).toBe('Bob');
  });
});

describe('bulk actions', () => {
  it('bulkAssign and bulkDelete do nothing for non-admins', async () => {
    initRender(notAdmin, () => 'Bob');
    toggleSelectMode(); toggleSelect('t1');
    await bulkAssign(); await bulkDelete();
    expect(state.tasks.t1.person).toBe('');
    expect(writeState).not.toHaveBeenCalled();
    expect(removeTask).not.toHaveBeenCalled();
  });
  it('bulkAssign works for admins', async () => {
    initRender(admin, () => 'Alice');
    toggleSelectMode(); toggleSelect('t1');
    await bulkAssign();
    expect(state.tasks.t1.person).toBe('Bob');
    expect(writeState).not.toHaveBeenCalled();
  });
});

describe('bulkAssign rotation (#138)', () => {
  const setup = () => {
    state.tasks.t1.rotation = ['Alice', 'Carol'];
    state.tasks.t2.rotation = { 0: 'Bob', 1: 'Alice' };
    state.tasks.t3 = { id: 't3', name: 'C', person: 'Alice', order: 3, done: false };
    document.getElementById('task-list').innerHTML += '<div class="task-card" data-id="t3"></div>';
    initRender(admin, () => 'Alice');
    toggleSelectMode(); toggleSelect('t1'); toggleSelect('t2'); toggleSelect('t3');
  };
  it('removes rotation when the person is not in it, with a toast', async () => {
    setup();
    await bulkAssign(); // Bob
    expect(patchPaths).toHaveBeenCalledTimes(1);
    expect(state.tasks.t1.rotation).toBeUndefined();
    expect(state.tasks.t2.rotation).toEqual({ 0: 'Bob', 1: 'Alice' });
    expect(showToast).toHaveBeenCalledWith('Rotation turned off for 1 chore');
  });
  it('removes rotation when assigning to Anyone', async () => {
    setup();
    document.getElementById('bulk-person').innerHTML = '<option value="">Anyone</option>';
    await bulkAssign();
    expect(patchPaths).toHaveBeenCalledWith({
      'tasks/t1/person': '', 'tasks/t1/rotation': null,
      'tasks/t2/person': '', 'tasks/t2/rotation': null,
      'tasks/t3/person': '',
    });
    expect(showToast).toHaveBeenCalledWith('Rotation turned off for 2 chores');
  });
  it('keeps rotation when the person is in it and writes only changed leaves', async () => {
    setup();
    await bulkAssign(); // Bob: t2 keeps rotation
    expect(patchPaths).toHaveBeenCalledWith({
      'tasks/t1/person': 'Bob', 'tasks/t1/rotation': null,
      'tasks/t2/person': 'Bob', 'tasks/t3/person': 'Bob',
    });
    expect(writeState).not.toHaveBeenCalled();
  });
  it('non-admin writes nothing', async () => {
    setup(); initRender(notAdmin, () => 'Bob');
    await bulkAssign();
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('reorder', () => {
  it('moveTask is ignored for non-admins', async () => {
    document.getElementById('task-list').innerHTML =
      '<div class="section"><div class="task-card" data-id="t1" id="tc-t1"></div><div class="task-card" data-id="t2" id="tc-t2"></div></div>';
    await moveTask('t1', 1, notAdmin);
    expect(state.tasks.t1.order).toBe(1);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(writeState).not.toHaveBeenCalled();
  });
});

describe('members', () => {
  it('toggleRole refuses to demote the last admin', async () => {
    await toggleRole('Alice', admin);
    expect(patchMember).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });
  it('toggleRole can demote an admin when another admin exists, and promote', async () => {
    state.members.Bob.role = 'admin';
    await toggleRole('Alice', admin);
    expect(patchMember).toHaveBeenCalledWith('Alice', { role: 'member' });
    state.members.Alice.role = 'member'; state.members.Bob.role = 'member';
    await toggleRole('Bob', admin);
    expect(patchMember).toHaveBeenLastCalledWith('Bob', { role: 'admin' });
  });
  it('removeMember asks for confirmation', async () => {
    confirm.mockReturnValueOnce(false);
    await removeMember('Bob', admin);
    expect(state.members.Bob).toBeDefined();
    await removeMember('Bob', admin);
    expect(state.members.Bob).toBeUndefined();
  });
});

describe('member-role CSS', () => {
  const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
  it.each(['#btn-select', '.subtask-del', '.subtask-add'])('hides %s for members', sel => {
    expect(css).toMatch(new RegExp('body\\[data-role="member"\\] ' + sel.replace(/[.#]/g, '\\$&')));
  });
});

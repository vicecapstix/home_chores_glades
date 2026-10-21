import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { nextRotationPerson, rotationList } from '../src/utils.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn(), patchMember: vi.fn(),
  patchRoot: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { writeState, patchRoot } from '../src/firebase.js';
import { checkTaskResets, editTask, saveTask, rotationChipsHTML } from '../src/tasks.js';
import { removeMember, renamePaths } from '../src/members.js';

const admin = () => true, notAdmin = () => false;
const MEM = ['Ann', 'Bo', 'Cy'];
const T0 = new Date(2026, 9, 12, 12).getTime();

describe('nextRotationPerson (#54)', () => {
  it('advances to the next name and wraps around', () => {
    expect(nextRotationPerson(['Ann', 'Bo', 'Cy'], 'Ann', MEM)).toBe('Bo');
    expect(nextRotationPerson(['Ann', 'Bo', 'Cy'], 'Cy', MEM)).toBe('Ann');
  });
  it('starts at the first name when unassigned or not in the list', () => {
    expect(nextRotationPerson(['Bo', 'Cy'], '', MEM)).toBe('Bo');
    expect(nextRotationPerson(['Bo', 'Cy'], 'Ann', MEM)).toBe('Bo');
  });
  it('skips removed members and does nothing with fewer than 2 left', () => {
    expect(nextRotationPerson(['Ann', 'Zed', 'Cy'], 'Ann', MEM)).toBe('Cy');
    expect(nextRotationPerson(['Ann', 'Zed'], 'Ann', MEM)).toBeNull();
    expect(nextRotationPerson(undefined, 'Ann', MEM)).toBeNull();
  });
  it('accepts the object form Firebase can return and drops duplicates', () => {
    expect(rotationList({ 0: 'Ann', 1: 'Bo', 2: 'Bo' }, MEM)).toEqual(['Ann', 'Bo']);
  });
});

describe('reset rotates the assignee', () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(T0);
    state.pause = null;
    state.members = { Ann: { name: 'Ann', role: 'admin' }, Bo: { name: 'Bo', role: 'member' }, Cy: { name: 'Cy', role: 'member' } };
  });
  afterEach(() => vi.useRealTimers());
  const task = extra => ({ id: 'a', name: 'Dishes', freq: 'daily', done: true, lastDone: T0 - 2 * 86400000, lastDoneBy: 'Ann', person: 'Ann', ...extra });

  it('moves person to the next rotation member in the same multi-path update', () => {
    state.tasks = { a: task({ rotation: ['Ann', 'Bo', 'Cy'] }) };
    checkTaskResets();
    expect(state.tasks.a.person).toBe('Bo');
    expect(patchRoot).toHaveBeenCalledWith(expect.objectContaining({ 'tasks/a/done': false, 'tasks/a/person': 'Bo' }));
  });
  it('leaves person alone without a rotation, and when the task is not due', () => {
    state.tasks = { a: task() , b: task({ id: 'b', rotation: ['Ann', 'Bo'], done: true, lastDone: T0 - 3600000 }) };
    checkTaskResets();
    expect(state.tasks.a.person).toBe('Ann');
    expect(state.tasks.b.person).toBe('Ann');
    expect(patchRoot.mock.calls[0][0]['tasks/a/person']).toBeUndefined();
  });
  it('does not rotate while paused', () => {
    state.pause = { start: 1 };
    state.tasks = { a: task({ rotation: ['Ann', 'Bo'] }) };
    checkTaskResets();
    expect(state.tasks.a.person).toBe('Ann');
  });
});

describe('edit UI saves rotation (admin only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.members = { Ann: { name: 'Ann', role: 'admin' }, Bo: { name: 'Bo', role: 'member' } };
    state.tasks = { a: { id: 'a', name: 'Dishes', freq: 'daily', person: 'Ann', done: false, lastDone: 0 } };
    document.body.innerHTML = '<div id="tc-a" class="task-card"></div>';
  });
  it('shows member checkboxes and persists 2+ selected as rotation', async () => {
    editTask('a', admin);
    const card = document.getElementById('tc-a');
    expect(card.querySelectorAll('.edit-rotation input').length).toBe(2);
    card.querySelectorAll('.edit-rotation input').forEach(i => { i.checked = true; });
    await saveTask('a', admin);
    expect(state.tasks.a.rotation).toEqual(['Ann', 'Bo']);
    expect(writeState).toHaveBeenCalled();
  });
  it('clears rotation when fewer than 2 are picked', async () => {
    state.tasks.a.rotation = ['Ann', 'Bo'];
    editTask('a', admin);
    const card = document.getElementById('tc-a');
    card.querySelector('.edit-rotation input[value="Bo"]').checked = false;
    await saveTask('a', admin);
    expect(state.tasks.a.rotation).toBeUndefined();
  });
  it('non-admin cannot save; chips are escaped and hidden with <2 members', async () => {
    editTask('a', admin);
    await saveTask('a', notAdmin);
    expect(writeState).not.toHaveBeenCalled();
    expect(rotationChipsHTML({}, ['Only'])).toBe('');
    expect(rotationChipsHTML({}, ['<b>x</b>', 'Bo'])).not.toContain('<b>x</b>');
  });
});

describe('member removal and rename keep rotations valid', () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubGlobal('confirm', () => true);
    state.members = { Ann: { name: 'Ann', role: 'admin' }, Bo: { name: 'Bo', role: 'member' }, Cy: { name: 'Cy', role: 'member' } };
    state.history = []; state.redemptions = {};
    state.tasks = {
      a: { id: 'a', person: 'Ann', rotation: ['Ann', 'Bo', 'Cy'] },
      b: { id: 'b', person: 'Bo', rotation: ['Bo', 'Cy'] },
    };
  });
  it('removing a member drops them from rotations; under 2 left removes the rotation', async () => {
    await removeMember('Cy', admin, () => 'Ann', null);
    expect(state.tasks.a.rotation).toEqual(['Ann', 'Bo']);
    expect(state.tasks.b.rotation).toBeUndefined();
  });
  it('renamePaths rewrites the rotation name', () => {
    const paths = renamePaths('Bo', 'Bobby');
    expect(paths['tasks/a/rotation']).toEqual(['Ann', 'Bobby', 'Cy']);
    expect(paths['tasks/b/rotation']).toEqual(['Bobby', 'Cy']);
  });
});

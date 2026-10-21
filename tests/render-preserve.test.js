import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { initRender, renderTasks } from '../src/render.js';
import { editTask } from '../src/tasks.js';

function task(id, name, extra = {}) {
  return { id, name, freq: 'weekly', done: false, lastDone: Date.now(), person: 'Al', difficulty: 'easy',
    subtasks: { s1: { id: 's1', name: 'sub', done: false } }, order: Number(id.slice(1)), ...extra };
}

beforeEach(() => {
  initRender(() => true, () => 'Al');
  state.members = { Al: { name: 'Al', role: 'admin' } };
  state.tasks = { t1: task('t1', 'Dishes'), t2: task('t2', 'Bins') };
  document.body.innerHTML = '<div id="task-list"></div>';
  renderTasks();
});

describe('re-render while editing (#34)', () => {
  it('keeps the inline edit form and typed text across a snapshot render', () => {
    editTask('t1', () => true);
    const input = document.querySelector('#tc-t1 .edit-name');
    input.value = 'Dishes and pans';
    state.tasks.t2.name = 'Bins (changed remotely)';
    renderTasks();
    expect(document.querySelector('#tc-t1').classList.contains('editing')).toBe(true);
    expect(document.querySelector('#tc-t1 .edit-name').value).toBe('Dishes and pans');
    expect(document.getElementById('tc-t2').textContent).toContain('changed remotely');
  });
  it('keeps typed subtask text and expanded subtask lists', () => {
    document.querySelector('#tc-t2 .subtask-toggle').classList.add('open');
    document.querySelector('#tc-t2 .subtask-list').classList.add('open');
    document.querySelector('#tc-t1 .subtask-add input').value = 'wipe counter';
    state.tasks.t2.notes = 'remote edit';
    renderTasks();
    expect(document.querySelector('#tc-t2 .subtask-list').classList.contains('open')).toBe(true);
    expect(document.querySelector('#tc-t2 .subtask-toggle').classList.contains('open')).toBe(true);
    expect(document.querySelector('#tc-t1 .subtask-add input').value).toBe('wipe counter');
  });
  it('drops an edited card that was deleted remotely and renders normally otherwise', () => {
    editTask('t1', () => true);
    delete state.tasks.t1;
    renderTasks();
    expect(document.getElementById('tc-t1')).toBeNull();
    expect(document.getElementById('tc-t2')).not.toBeNull();
  });
  it('a card that is not being edited still refreshes', () => {
    state.tasks.t1.name = 'Renamed';
    renderTasks();
    expect(document.getElementById('tc-t1').textContent).toContain('Renamed');
  });
});

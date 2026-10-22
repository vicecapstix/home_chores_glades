import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(),
  patchRoot: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot } from '../src/firebase.js';
import { checkTaskResets } from '../src/tasks.js';
import { doneAgoLabel } from '../src/utils.js';
import { initRender, renderTasks } from '../src/render.js';

const DAY = 86400000;
const T0 = new Date(2026, 9, 14, 12).getTime();
const subs = () => ({ s1: { id: 's1', name: 'a', done: true }, s2: { id: 's2', name: 'b', done: false }, s3: { id: 's3', name: 'c', done: true } });
const task = extra => ({ id: 'a', name: 'Dishes', freq: 'daily', done: true, lastDone: T0 - 2 * DAY, lastDoneBy: 'Ann', person: 'Ann', subtasks: subs(), ...extra });

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(T0);
  state.pause = null;
  state.members = { Ann: { name: 'Ann', role: 'admin' }, Bo: { name: 'Bo', role: 'member' } };
});
afterEach(() => vi.useRealTimers());

describe('subtasks reset with their recurring task (#38)', () => {
  it('unticks done subtasks in the same single multi-path update', () => {
    state.tasks = { a: task() };
    checkTaskResets();
    expect(patchRoot).toHaveBeenCalledTimes(1);
    const p = patchRoot.mock.calls[0][0];
    expect(p['tasks/a/done']).toBe(false);
    expect(p['tasks/a/subtasks/s1/done']).toBe(false);
    expect(p['tasks/a/subtasks/s3/done']).toBe(false);
    expect('tasks/a/subtasks/s2/done' in p).toBe(false);
    expect(Object.values(state.tasks.a.subtasks).every(s => !s.done)).toBe(true);
    expect(Object.keys(p).every(k => k.startsWith('tasks/a/'))).toBe(true);
  });
  it('also resets specific-days tasks', () => {
    state.tasks = { a: task({ freq: 'weekdays', days: [1, 3], lastDone: T0 - 2 * DAY }) };
    checkTaskResets();
    expect(patchRoot.mock.calls[0][0]['tasks/a/subtasks/s1/done']).toBe(false);
  });
  it('leaves not-done tasks, once tasks and not-yet-due tasks alone', () => {
    state.tasks = {
      a: task({ done: false }),
      b: task({ id: 'b', freq: 'once' }),
      c: task({ id: 'c', lastDone: T0 - 3600000 }),
    };
    checkTaskResets();
    expect(patchRoot).not.toHaveBeenCalled();
    expect(state.tasks.a.subtasks.s1.done).toBe(true);
  });
  it('still rotates the assignee in the same update', () => {
    state.tasks = { a: task({ rotation: ['Ann', 'Bo'] }) };
    checkTaskResets();
    const p = patchRoot.mock.calls[0][0];
    expect(p['tasks/a/person']).toBe('Bo');
    expect(p['tasks/a/subtasks/s1/done']).toBe(false);
  });
  it('tolerates tasks without subtasks', () => {
    state.tasks = { a: task({ subtasks: undefined }) };
    checkTaskResets();
    expect(Object.keys(patchRoot.mock.calls[0][0]).some(k => k.includes('subtasks'))).toBe(false);
  });
});

describe('done label shows the real completion day', () => {
  it('doneAgoLabel', () => {
    expect(doneAgoLabel(T0 - 3600000, T0)).toBe('today');
    expect(doneAgoLabel(T0 - DAY, T0)).toBe('yesterday');
    expect(doneAgoLabel(T0 - 3 * DAY, T0)).toBe('3 days ago');
  });
  it('section is "Done" and the card says how long ago', () => {
    initRender(() => true, () => 'Ann');
    state.tasks = { a: task({ freq: 'weekly', lastDone: T0 - 3 * DAY }) };
    document.body.innerHTML = '<div id="task-list"></div>';
    renderTasks();
    const head = document.querySelector('.section[data-k="done"] .section-head').textContent;
    expect(head.trim()).toBe('Done');
    expect(document.querySelector('.section[data-k="done"]').textContent).toContain('3 days ago');
  });
});

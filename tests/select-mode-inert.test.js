import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { initRender, renderTasks, toggleSelectMode, getSelectMode, getSelectedIds, toggleSelect, cardHTML } from '../src/render.js';

const task = (id, o = {}) => ({ id, name: id, freq: 'weekly', done: false, lastDone: Date.now(), person: '', difficulty: 'easy', order: 1,
  subtasks: { s1: { id: 's1', name: 'sub', done: false } }, ...o });

// jsdom's inline handlers can't see test-defined window.* spies, so emulate a click bubbling up the
// ancestors and evaluate each onclick attribute against a fake window of spies (honours stopPropagation).
const spies = {};
const fakeWindow = {};
function click(el) {
  let stopped = false;
  const event = { stopPropagation() { stopped = true; }, key: '' };
  for (let n = el; n && !stopped; n = n.parentElement) {
    const code = n.getAttribute && n.getAttribute('onclick');
    if (code) new Function('event', 'window', code)(event, fakeWindow);
  }
}
beforeEach(() => {
  for (const n of ['editTask', 'deleteTask', 'claimTask', 'toggleSubtasks', 'moveTask', 'skipTask', 'addSubtask']) fakeWindow[n] = spies[n] = vi.fn();
  fakeWindow.toggleSelect = vi.fn(id => toggleSelect(id));
  initRender(() => true, () => 'Al');
  state.members = { Al: { name: 'Al', role: 'admin' } };
  state.tasks = { t1: task('t1') };
  document.body.innerHTML = '<div id="task-list"></div><button id="btn-select"></button><div id="bulk-bar"><span id="bulk-count"></span></div>';
  if (getSelectMode()) toggleSelectMode();
  renderTasks();
});

const ACTIONS = ['.edit-btn', '.del', '.btn-claim', '.subtask-toggle', '.move-btn', '.skip-btn', '.subtask-section'];

describe('select mode keeps per-card actions out of the way (#167)', () => {
  it('outside select mode all action buttons are present', () => {
    for (const sel of ACTIONS) expect(document.querySelector('#tc-t1 ' + sel), sel).not.toBeNull();
  });
  it('in select mode edit/delete/claim/subtask/move/skip are not rendered', () => {
    toggleSelectMode();
    for (const sel of ACTIONS) expect(document.querySelector('#tc-t1 ' + sel), sel).toBeNull();
    expect(cardHTML(state.tasks.t1)).not.toMatch(/editTask|deleteTask|claimTask/);
  });
  it('clicking where the buttons were only toggles selection once and runs no action', () => {
    toggleSelectMode();
    const card = document.getElementById('tc-t1');
    click(card.querySelector('.task-meta'));
    click(card.querySelector('.card-main'));
    expect(fakeWindow.toggleSelect).toHaveBeenCalledTimes(2);
    expect(getSelectedIds().size).toBe(0); // toggled on then off
    for (const n of ['editTask', 'deleteTask', 'claimTask', 'toggleSubtasks']) expect(spies[n]).not.toHaveBeenCalled();
  });
  it('outside select mode, clicking Edit runs only editTask (no selection)', () => {
    click(document.querySelector('#tc-t1 [title="Edit"]'));
    click(document.querySelector('#tc-t1 .btn-claim'));
    expect(spies.editTask).toHaveBeenCalledWith('t1');
    expect(spies.claimTask).toHaveBeenCalledWith('t1');
    expect(fakeWindow.toggleSelect).not.toHaveBeenCalled();
  });
  it('leaving select mode restores the buttons', () => {
    toggleSelectMode(); toggleSelectMode();
    expect(document.querySelector('#tc-t1 .edit-btn')).not.toBeNull();
    expect(document.querySelector('#tc-t1 .btn-claim')).not.toBeNull();
  });
});

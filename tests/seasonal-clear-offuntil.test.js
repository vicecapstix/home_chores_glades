import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn().mockResolvedValue(undefined), patchMember: vi.fn(),
  patchPaths: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { patchPaths } from '../src/firebase.js';
import { dueStatus, localDateStr } from '../src/utils.js';
import { saveTask } from '../src/tasks.js';

const DAY = 86400000;
const NOW = new Date(2026, 5, 10, 12).getTime();
const day = n => localDateStr(new Date(NOW + n * DAY));
const admin = () => true;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.members = { Ann: { name: 'Ann', role: 'admin' } }; state.pause = null;
  state.tasks = { lawn: { id: 'lawn', name: 'Mow lawn', freq: 'weekly', difficulty: 'easy', person: '', done: false, lastDone: NOW - 30 * DAY, offUntil: day(20), subtasks: {} } };
  document.body.innerHTML = '<div id="tc-lawn"><input class="edit-name" value="Mow lawn"><select class="edit-freq"><option value="weekly" selected></option></select>' +
    '<div class="edit-days"></div><input class="edit-interval"><input class="edit-duedate"><input class="edit-duetime"><select class="edit-diff"><option value="easy" selected></option></select>' +
    '<select class="edit-cat"><option value="" selected></option></select><select class="edit-person"><option value="" selected></option></select>' +
    '<input type="date" class="edit-offuntil"><textarea class="edit-notes"></textarea></div>';
  document.querySelector('.edit-offuntil').value = ''; // admin clears "Switch off until"
});

describe('clearing "Switch off until" in the edit form', () => {
  it('keeps lastDone for a once chore', async () => {
    state.tasks.lawn.freq = 'once';
    await saveTask('lawn', admin);
    expect(state.tasks.lawn.lastDone).toBe(NOW - 30 * DAY);
  });
  it('keeps lastDone for a done chore', async () => {
    state.tasks.lawn.done = true;
    await saveTask('lawn', admin);
    expect(state.tasks.lawn.lastDone).toBe(NOW - 30 * DAY);
  });
  it('does not touch lastDone when the chore was not off', async () => {
    delete state.tasks.lawn.offUntil;
    await saveTask('lawn', admin);
    expect(state.tasks.lawn.lastDone).toBe(NOW - 30 * DAY);
  });
  it('makes the chore due now (like switchOnNow / auto switch-back), not months overdue', async () => {
    await saveTask('lawn', admin);
    expect(patchPaths.mock.calls[0][0]['tasks/lawn/offUntil']).toBeNull();
    expect(dueStatus(state.tasks.lawn, NOW)).not.toBe('overdue'); // actual: overdue (lastDone still 30 days old)
  });
});

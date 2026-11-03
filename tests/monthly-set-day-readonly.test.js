// #255: the read-only TV view can never add or edit chores, so it can never set monthDay.
import { it, expect, vi } from 'vitest';
import { state } from '../src/state.js';
vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ patchPaths: vi.fn(), patchTask: vi.fn(), patchRoot: vi.fn(), writeState: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchPaths } from '../src/firebase.js';
import { addTask, saveTask, editTask } from '../src/tasks.js';

it('READONLY add / edit / save write nothing even as admin', async () => {
  state.tasks = { a: { id: 'a', name: 'S', freq: 'monthly', monthDay: 15 } };
  document.body.innerHTML = '<input id="new-task" value="X"><select id="new-freq"><option value="monthly" selected></option></select><select id="new-monthday"><option value="1" selected></option></select>' +
    '<div id="tc-a"><input class="edit-name" value="S"><select class="edit-freq"><option value="monthly" selected></option></select><select class="edit-monthday"><option value="3" selected></option></select></div>';
  await addTask(() => true); await saveTask('a', () => true); editTask('a', () => true);
  expect(patchPaths).not.toHaveBeenCalled();
  expect(Object.keys(state.tasks)).toEqual(['a']); expect(state.tasks.a.monthDay).toBe(15);
  expect(document.querySelector('.edit-monthday').value).toBe('3'); // edit form not opened
});

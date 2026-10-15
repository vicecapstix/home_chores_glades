import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn(),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import * as fb from '../src/firebase.js';
import { checkTaskResets, claimTask } from '../src/tasks.js';

beforeEach(() => vi.clearAllMocks());

describe('readonly (TV) clients never write resets or claims', () => {
  it('checkTaskResets does not write', () => {
    state.tasks = { a: { id: 'a', name: 'A', freq: 'daily', done: true, lastDone: 1 } };
    checkTaskResets();
    expect(fb.patchRoot).not.toHaveBeenCalled();
    expect(fb.writeState).not.toHaveBeenCalled();
  });
  it('claimTask does not write', async () => {
    state.tasks = { a: { id: 'a', name: 'A', freq: 'daily', person: '' } };
    await claimTask('a', () => 'Al');
    expect(fb.patchTask).not.toHaveBeenCalled();
    expect(fb.writeState).not.toHaveBeenCalled();
  });
});

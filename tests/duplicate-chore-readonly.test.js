import { describe, it, expect, vi } from 'vitest';
import { state } from '../src/state.js';
vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ patchPaths: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn(), resetTasks: vi.fn(), takeCheckPending: vi.fn(), adjustMemberPoints: vi.fn(), appendHistory: vi.fn(), removeHistoryEntry: vi.fn(), patchSubtask: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchPaths } from '../src/firebase.js';
import { duplicateTask } from '../src/tasks.js';

describe('duplicate a chore is blocked on the readonly TV (#405)', () => {
  it('READONLY never copies, even for an admin', async () => {
    state.tasks = { t1: { id: 't1', name: 'Dishes', freq: 'daily' } };
    await duplicateTask('t1', () => true);
    expect(patchPaths).not.toHaveBeenCalled();
    expect(Object.keys(state.tasks)).toEqual(['t1']);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  appendHistory: vi.fn().mockResolvedValue({ ok: true }),
  removeHistoryEntry: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot, removeHistoryEntry } from '../src/firebase.js';
import { pushUndo } from '../src/undo.js';
import { acceptSwap } from '../src/swaps.js';

async function accept() {
  state.swaps = { sw1: { id: 'sw1', taskId: 't1', taskName: 'Dishes', from: 'Amy', to: 'Ben', offeredAt: Date.now(), lastDone: 0 } };
  await acceptSwap('sw1', () => 'Ben');
  patchRoot.mockClear();
  return pushUndo.mock.calls[0][0].undo;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.members = { Amy: { name: 'Amy' }, Ben: { name: 'Ben' } };
  state.tasks = { t1: { id: 't1', name: 'Dishes', person: 'Amy', done: false } };
  state.history = [];
});

describe('swap undo after the chore was reassigned (#393)', () => {
  it('throws so the toast says "Restore failed", and writes nothing', async () => {
    const undo = await accept();
    state.tasks.t1.person = 'Cat';
    await expect(undo()).rejects.toThrow(/reassigned/);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(removeHistoryEntry).not.toHaveBeenCalled();
    expect(state.tasks.t1.person).toBe('Cat');
  });
  it('throws when the chore was deleted', async () => {
    const undo = await accept();
    delete state.tasks.t1;
    await expect(undo()).rejects.toThrow();
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('normal undo still moves the chore back and removes the swap history row', async () => {
    const undo = await accept();
    await undo();
    expect(patchRoot).toHaveBeenCalledWith({ 'tasks/t1/person': 'Amy' });
    expect(removeHistoryEntry).toHaveBeenCalledTimes(1);
  });
});

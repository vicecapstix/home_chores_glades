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
import { showToast } from '../src/ui.js';
import { pushUndo } from '../src/undo.js';
import { acceptSwap } from '../src/swaps.js';

const asBen = () => 'Ben';
async function accept() {
  state.swaps = { sw1: { id: 'sw1', taskId: 't1', taskName: 'Dishes', from: 'Amy', to: 'Ben', offeredAt: Date.now(), lastDone: 0 } };
  await acceptSwap('sw1', asBen);
  patchRoot.mockClear(); showToast.mockClear();
  return pushUndo.mock.calls[0][0].undo;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.members = { Amy: { name: 'Amy' }, Ben: { name: 'Ben' } };
  state.tasks = { t1: { id: 't1', name: 'Dishes', person: 'Amy', done: false } };
  state.history = [];
});

describe('swap undo after the taker ticked the chore (#352)', () => {
  it('does nothing and explains when the chore is now done', async () => {
    const undo = await accept();
    Object.assign(state.tasks.t1, { done: true, lastDone: Date.now(), lastDoneBy: 'Ben' });
    await undo();
    expect(patchRoot).not.toHaveBeenCalled();
    expect(removeHistoryEntry).not.toHaveBeenCalled();
    expect(state.tasks.t1.person).toBe('Ben');
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/can.t undo/i));
  });
  it('does nothing when lastDone changed (ticked and unticked, or reset)', async () => {
    const undo = await accept();
    state.tasks.t1.lastDone = 12345;
    await undo();
    expect(patchRoot).not.toHaveBeenCalled();
    expect(removeHistoryEntry).not.toHaveBeenCalled();
  });
  it('still works when the chore is untouched: reassigns and removes the history note', async () => {
    const undo = await accept();
    await undo();
    expect(patchRoot).toHaveBeenCalledWith({ 'tasks/t1/person': 'Amy' });
    expect(removeHistoryEntry).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { isStaleDoneOnce } from '../src/utils.js';
import { clearDoneOnes } from '../src/tasks.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(),
  patchSubtask: vi.fn(), adjustMemberPoints: vi.fn(),
  patchRoot: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot } from '../src/firebase.js';
import { pushUndo } from '../src/undo.js';

const NOW = new Date('2026-05-13T12:00:00');
const day = (n) => NOW.getTime() - n * 86400000;
const mk = (id, o) => ({ id, name: id, freq: 'once', done: true, lastDone: day(2), ...o });

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  vi.stubGlobal('confirm', vi.fn(() => true));
  state.tasks = {
    old: mk('old'), today: mk('today', { lastDone: day(0) }), open: mk('open', { done: false }),
    daily: mk('daily', { freq: 'daily' }), weekly: mk('weekly', { freq: 'weekly' }),
  };
  vi.clearAllMocks();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('isStaleDoneOnce (grouping)', () => {
  it('matches only done one-offs from an earlier day', () => {
    const ids = Object.values(state.tasks).filter(t => isStaleDoneOnce(t)).map(t => t.id);
    expect(ids).toEqual(['old']);
  });
});

describe('clearDoneOnes', () => {
  it('builds a single multi-path null update and leaves recurring/today/open alone', async () => {
    await clearDoneOnes(() => true);
    expect(patchRoot).toHaveBeenCalledTimes(1);
    expect(patchRoot).toHaveBeenCalledWith({ 'tasks/old': null });
  });
  it('undo restores the removed tasks in one update', async () => {
    const before = { ...state.tasks.old };
    await clearDoneOnes(() => true);
    await pushUndo.mock.calls[0][0].undo();
    expect(patchRoot).toHaveBeenLastCalledWith({ 'tasks/old': before });
  });
  it('is admin-only', async () => {
    await clearDoneOnes(() => false);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('does nothing when the confirm is declined or nothing is stale', async () => {
    confirm.mockReturnValue(false);
    await clearDoneOnes(() => true);
    expect(patchRoot).not.toHaveBeenCalled();
    state.tasks = { d: mk('d', { freq: 'daily' }) };
    confirm.mockReturnValue(true);
    await clearDoneOnes(() => true);
    expect(patchRoot).not.toHaveBeenCalled();
  });
});

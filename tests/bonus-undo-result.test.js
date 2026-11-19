import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

let results;
vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), get READONLY() { return globalThis.__RO === true; } }));
vi.mock('../src/firebase.js', () => ({
  adjustMemberPoints: vi.fn(async () => results.shift() ?? { ok: true, weekDelta: 5 }),
  appendHistory: vi.fn().mockResolvedValue({ ok: true }),
  removeHistoryEntry: vi.fn().mockResolvedValue({ ok: true, removed: true }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { adjustMemberPoints, removeHistoryEntry } from '../src/firebase.js';
import { pushUndo } from '../src/undo.js';
import { adjustBonus } from '../src/bonus.js';

const admin = () => true, nobody = () => false, asDad = () => 'Dad';
async function award() {
  results = [{ ok: true, weekDelta: 5 }];
  await adjustBonus('Amy', 5, 'Helped out', admin, asDad);
  return pushUndo.mock.calls[0][0].undo;
}

beforeEach(() => {
  vi.clearAllMocks(); globalThis.__RO = false; results = [];
  state.members = { Amy: { name: 'Amy', points: 10, weekPoints: 0 } };
  state.history = [];
});

describe('bonus undo checks the reversal result (#376)', () => {
  it('throws and keeps the history entry when the member is gone', async () => {
    const undo = await award();
    results = [{ ok: false, reason: 'missing' }];
    await expect(undo()).rejects.toThrow();
    expect(removeHistoryEntry).not.toHaveBeenCalled();
  });
  it('throws and keeps the history entry when offline (cached copy showing)', async () => {
    const undo = await award();
    results = [{ ok: false, reason: 'readonly' }];
    await expect(undo()).rejects.toThrow();
    expect(removeHistoryEntry).not.toHaveBeenCalled();
  });
  it('removes the history entry when the reversal succeeds', async () => {
    const undo = await award();
    results = [{ ok: true, weekDelta: -5 }];
    await undo();
    expect(adjustMemberPoints).toHaveBeenLastCalledWith('Amy', expect.objectContaining({ pts: -5, weekPts: -5, allowNegative: true }));
    expect(removeHistoryEntry).toHaveBeenCalledWith(expect.objectContaining({ type: 'bonus', person: 'Amy' }));
  });
  it('non-admin and READONLY still cannot award (no undo is pushed)', async () => {
    results = [];
    expect(await adjustBonus('Amy', 5, 'x', nobody, asDad)).toBe(false);
    globalThis.__RO = true;
    expect(await adjustBonus('Amy', 5, 'x', admin, asDad)).toBe(false);
    expect(pushUndo).not.toHaveBeenCalled();
  });
});

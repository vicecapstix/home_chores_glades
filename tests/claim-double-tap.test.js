import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn(),
  takeClaim: vi.fn().mockResolvedValue(true),
  adjustMemberPoints: vi.fn().mockResolvedValue({ ok: true, reason: '' }),
  appendHistory: vi.fn().mockResolvedValue({ ok: true }),
  removeHistoryEntry: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot } from '../src/firebase.js';
import { submitClaim } from '../src/claims.js';

const asAmy = () => 'Amy';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  state.members = { Amy: { name: 'Amy', role: 'member', points: 0 } };
  state.claims = {};
});
afterEach(() => vi.useRealTimers());

describe('submitClaim in-flight guard (#333)', () => {
  it('a second send while the first is saving does nothing', async () => {
    let release;
    patchRoot.mockReturnValueOnce(new Promise(r => { release = r; }));
    const first = submitClaim('Mowed lawn', '5', asAmy);
    vi.advanceTimersByTime(150);
    expect(await submitClaim('Mowed lawn', '5', asAmy)).toBe(false);
    release();
    expect(await first).toBe(true);
    expect(patchRoot).toHaveBeenCalledTimes(1);
    expect(Object.keys(state.claims)).toHaveLength(1);
  });
  it('the guard is released after a failed save', async () => {
    patchRoot.mockRejectedValueOnce(new Error('offline'));
    expect(await submitClaim('Mowed lawn', '5', asAmy)).toBe(false);
    patchRoot.mockResolvedValueOnce(undefined);
    expect(await submitClaim('Mowed lawn', '5', asAmy)).toBe(true);
    expect(patchRoot).toHaveBeenCalledTimes(2);
  });
});

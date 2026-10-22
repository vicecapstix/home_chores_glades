import { describe, it, expect, vi } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ adjustMemberPoints: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import * as fb from '../src/firebase.js';
import { adjustBonus } from '../src/bonus.js';

describe('adjustBonus in readonly (TV) mode', () => {
  it('is a no-op', async () => {
    state.members = { Alice: { name: 'Alice', role: 'member', points: 10 } };
    expect(await adjustBonus('Alice', 5, 'r', () => true, () => 'Dad')).toBe(false);
    expect(fb.adjustMemberPoints).not.toHaveBeenCalled();
    expect(fb.patchRoot).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { patchMember } from '../src/firebase.js';
import { setGoal } from '../src/savings.js';

describe('readonly', () => {
  it('setGoal is a no-op', async () => {
    state.rewards = { r1: { id: 'r1', name: 'A', cost: 5 } };
    state.members = { Kid: { name: 'Kid', points: 1 } };
    expect(await setGoal('Kid', 'r1', () => 'Kid', () => true)).toBe(false);
    expect(patchMember).not.toHaveBeenCalled();
  });
});

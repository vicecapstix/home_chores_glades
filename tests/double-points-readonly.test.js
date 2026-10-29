import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ patchRoot: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { patchRoot } from '../src/firebase.js';
import { setDoublePoints, clearDoublePoints } from '../src/doublepoints.js';

describe('double-points writes in READONLY (TV)', () => {
  it('set and clear do nothing even for an admin', async () => {
    expect(await setDoublePoints('2999-01-01', 2, () => true)).toBe(false);
    expect(await clearDoublePoints(() => true)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
  });
});

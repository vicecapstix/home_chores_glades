import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ patchRoot: vi.fn(), patchPaths: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { patchRoot, patchPaths } from '../src/firebase.js';
import { state } from '../src/state.js';
import { setPocketMoney, clearPocketMoney, markPaid } from '../src/pocketmoney.js';

describe('pocket money in READONLY (TV)', () => {
  it('blocks every write even for an admin', async () => {
    state.pocketMoney = { pts: 10, amount: 1 };
    state.members = { Kid: { name: 'Kid', points: 5 } };
    expect(await setPocketMoney(10, 1, () => true)).toBe(false);
    expect(await clearPocketMoney(() => true)).toBe(false);
    expect(await markPaid('Kid', () => true, () => 'Mum')).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

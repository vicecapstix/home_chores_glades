import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/modals.js', () => ({ openModal: vi.fn() }));
import { openModal } from '../src/modals.js';
import { openFairness } from '../src/fairness.js';

describe('fairness report on the TV (READONLY)', () => {
  it('never opens, even for an admin', () => {
    openFairness(() => true);
    expect(openModal).not.toHaveBeenCalled();
  });
});

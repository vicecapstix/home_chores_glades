import { it, expect, vi } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ patchRoot: vi.fn(), appendHistory: vi.fn(), removeHistoryEntry: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot } from '../src/firebase.js';
import { offerSwap, acceptSwap, declineSwap, renderSwaps, canOfferSwap } from '../src/swaps.js';

it('READONLY (TV) blocks every swap write and hides the offers (#228)', async () => {
  state.members = { Amy: {}, Ben: {} };
  state.tasks = { t1: { id: 't1', name: 'Dishes', person: 'Amy', done: false } };
  state.swaps = { s1: { id: 's1', taskId: 't1', taskName: 'Dishes', from: 'Amy', to: 'Ben', offeredAt: Date.now(), lastDone: 0 } };
  expect(await offerSwap('t1', 'Ben', () => 'Amy')).toBe(false);
  expect(await acceptSwap('s1', () => 'Ben')).toBe(false);
  expect(await declineSwap('s1', () => 'Ben')).toBe(false);
  expect(patchRoot).not.toHaveBeenCalled();
  expect(canOfferSwap(state.tasks.t1, 'Amy')).toBe(false);
  document.body.innerHTML = '<div id="swaps-section">x</div>';
  renderSwaps('Ben');
  expect(document.getElementById('swaps-section').innerHTML).toBe('');
});

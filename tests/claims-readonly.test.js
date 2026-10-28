import { it, expect, vi } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ patchRoot: vi.fn(), takeClaim: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { renderClaims } from '../src/claims.js';
import { refreshRewards } from '../src/rewards.js';

it('TV (READONLY) hides the claim form, the claims list and the badge, even for an admin (#224)', () => {
  document.body.innerHTML = '<div id="claims-section"></div><form id="claim-form" class="claim-form"></form>' +
    '<span id="rewards-badge"></span><div id="rewards-modal" class="hidden"></div>';
  state.members = { Amy: { name: 'Amy', role: 'member' }, Dad: { name: 'Dad', role: 'admin' } };
  state.redemptions = {};
  state.claims = { c1: { id: 'c1', member: 'Amy', name: 'Carried shopping', points: 5, requestedAt: 1 } };
  renderClaims(() => true, 'Amy');
  expect(document.getElementById('claim-form').classList.contains('hidden')).toBe(true);
  expect(document.getElementById('claims-section').innerHTML).toBe('');
  refreshRewards(() => true);
  expect(document.getElementById('rewards-badge').classList.contains('hidden')).toBe(true);
});

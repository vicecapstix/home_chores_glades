import { it, expect, vi } from 'vitest';
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), MAX_TEMPLATES: 20, MAX_TEMPLATE_TASKS: 100 }));
vi.mock('../src/firebase.js', () => ({ patchRoot: vi.fn() }));
vi.mock('../src/members.js', () => ({ validateMemberName: () => '' }));
vi.mock('../src/rewards.js', () => ({ validateReward: () => ({ error: 1 }), MAX_REWARDS: 50 }));
vi.mock('../src/redemptions.js', () => ({ MAX_REDEMPTIONS: 100 }));
vi.mock('../src/config.js', () => ({ READONLY: true, HISTORY_CAP: 500 }));
import * as fb from '../src/firebase.js';
import { prepareRestore, confirmRestore } from '../src/restore.js';

it('READONLY (TV) never loads or restores, even for admin (#175)', async () => {
  const file = { text: vi.fn() };
  expect(await prepareRestore(file, () => true)).toBe(false);
  expect(file.text).not.toHaveBeenCalled();
  expect(await confirmRestore('RESTORE', () => true)).toBe(false);
  expect(fb.patchRoot).not.toHaveBeenCalled();
});

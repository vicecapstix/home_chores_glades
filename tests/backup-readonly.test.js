import { it, expect, vi } from 'vitest';
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/firebase.js', () => ({}));
vi.mock('../src/config.js', () => ({ READONLY: true }));
import { downloadBackup } from '../src/backup.js';

it('READONLY (TV) never downloads, even for admin (#93)', () => {
  globalThis.URL.createObjectURL = vi.fn();
  downloadBackup(() => true);
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

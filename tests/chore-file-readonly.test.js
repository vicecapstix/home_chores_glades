// #234: the TV / read-only view can never download or upload chores, even as admin.
import { it, expect, vi } from 'vitest';
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/firebase.js', () => ({ patchPaths: vi.fn() }));
vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
import { patchPaths } from '../src/firebase.js';
import { downloadChores, prepareChoreUpload, confirmChoreUpload } from '../src/chorefile.js';

it('READONLY never downloads, previews or writes', async () => {
  globalThis.URL.createObjectURL = vi.fn();
  expect(downloadChores(() => true)).toBe(false);
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  const f = { size: 10, text: vi.fn() };
  expect(await prepareChoreUpload(f, () => true)).toBe(false);
  expect(f.text).not.toHaveBeenCalled();
  expect(await confirmChoreUpload(() => true)).toBe(0);
  expect(patchPaths).not.toHaveBeenCalled();
});

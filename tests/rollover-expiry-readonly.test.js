// #249: the readonly TV rollover tick never writes, even when a pause / away period has ended.
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(),
  patchRoot: vi.fn(() => Promise.resolve()), patchPaths: vi.fn(() => Promise.resolve()),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import * as fb from '../src/firebase.js';
import { startRollover } from '../src/rollover.js';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-05-11T20:00:00')); vi.clearAllMocks(); });
afterEach(() => vi.useRealTimers());

it('READONLY: expired pause and away write nothing', async () => {
  const DAY = 86400000;
  state.pause = { until: '2026-05-11', since: Date.now() - 3 * DAY };
  state.members = { Bo: { name: 'Bo', role: 'member', awayUntil: '2026-05-11', awaySince: Date.now() - 3 * DAY } };
  state.tasks = {};
  const stop = startRollover(vi.fn());
  await vi.advanceTimersByTimeAsync(6 * 3600000);
  stop();
  expect(fb.patchRoot).not.toHaveBeenCalled();
  expect(fb.patchPaths).not.toHaveBeenCalled();
  expect(fb.patchMember).not.toHaveBeenCalled();
});

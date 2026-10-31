import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  patchMember: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import * as fb from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { setAway, computeReturnPatch } from '../src/away.js';

const DAY = 86400000;
const NOW = new Date(2026, 9, 14, 12, 0, 0).getTime(); // Wed 14 Oct 2026
const admin = () => true;

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW);
  Object.assign(state, { members: { Al: { name: 'Al', role: 'admin' }, Bo: { name: 'Bo', role: 'member', lastStreakDate: '2026-10-01' } }, tasks: {} });
});
afterEach(() => vi.useRealTimers());

describe('extending away keeps the original start (#230)', () => {
  it('already away: only awayUntil is patched, awaySince is kept', async () => {
    const since = NOW - 2 * DAY;
    Object.assign(state.members.Bo, { awayUntil: '2026-10-15', awaySince: since });
    expect(await setAway('Bo', '2026-10-18', admin)).toBe(true);
    expect(fb.patchMember).toHaveBeenCalledWith('Bo', { awayUntil: '2026-10-18' });
    expect(state.members.Bo.awaySince).toBe(since);
    expect(state.members.Bo.awayUntil).toBe('2026-10-18');
    expect(showToast).toHaveBeenCalledWith('Bo is away until 2026-10-18');
  });
  it('not away: awaySince is set to now', async () => {
    expect(await setAway('Bo', '2026-10-20', admin)).toBe(true);
    expect(fb.patchMember).toHaveBeenCalledWith('Bo', { awayUntil: '2026-10-20', awaySince: NOW });
    expect(showToast).toHaveBeenCalledWith('Bo is away until 2026-10-20');
  });
  it('extend then return shifts chores and streak by the full time away', async () => {
    const since = NOW - 2 * DAY;
    Object.assign(state.members.Bo, { awayUntil: '2026-10-15', awaySince: since });
    state.tasks.t1 = { id: 't1', name: 'Bins', freq: 'weekly', person: 'Bo', lastDone: since - 3 * DAY };
    await setAway('Bo', '2026-10-18', admin);
    const end = NOW + 4 * DAY;
    const p = computeReturnPatch(state.members.Bo, state.tasks, end);
    expect(p['tasks/t1/lastDone']).toBe(since - 3 * DAY + (end - since));
    expect(p['members/Bo/lastStreakDate']).toBe('2026-10-07');
  });
});

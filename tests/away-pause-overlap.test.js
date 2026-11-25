import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn(), patchRoot: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import * as fb from '../src/firebase.js';
import { checkAwayExpiry, computeReturnPatch } from '../src/away.js';
import { computeResumePatch } from '../src/pause.js';

const H = 3600000;
const MON = new Date(2026, 9, 12, 9, 0, 0).getTime();   // Mon 12 Oct 09:00 (away starts)
const TUE = new Date(2026, 9, 13, 9, 0, 0).getTime();   // Tue 13 Oct 09:00 (pause starts)
const THU = new Date(2026, 9, 15, 0, 0, 0).getTime();   // away ends (awayUntil Wed 14)
const FRI = new Date(2026, 9, 17, 0, 0, 0).getTime();   // pause ends (until Fri 16, ends Sat 00:00)
const LAST = new Date(2026, 9, 5, 12, 0, 0).getTime();
const bo = (o = {}) => ({ name: 'Bo', role: 'member', awayUntil: '2026-10-14', awaySince: MON, ...o });
const task = { id: 't1', name: 'Bins', freq: 'weekly', person: 'Bo', lastDone: LAST };

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(FRI);
  Object.assign(state, { members: { Bo: bo() }, tasks: { t1: { ...task } }, pause: null });
});
afterEach(() => vi.useRealTimers());

describe('away + overlapping pause (#391)', () => {
  it('shifts by the union (111 h), not away + pause (150 h)', () => {
    const pause = { until: '2026-10-16', since: TUE };
    const patch = computeResumePatch(pause, { t1: task }, { Bo: bo() }, FRI);
    expect(patch['tasks/t1/lastDone'] - LAST).toBe(111 * H);
    expect(patch['members/Bo/awayUntil']).toBeNull();
    expect(patch['members/Bo/awaySince']).toBeNull();
    expect(patch.pause).toBeNull();
  });
  it('an expired away waits while the house is paused', () => {
    state.pause = { until: '2026-10-16', since: TUE };
    checkAwayExpiry(FRI);
    expect(fb.patchPaths).not.toHaveBeenCalled();
  });
});

describe('unchanged behaviour', () => {
  it('away without pause shifts by the away time only', () => {
    const patch = computeReturnPatch(bo(), { t1: task }, THU);
    expect(patch['tasks/t1/lastDone'] - LAST).toBe(63 * H);
  });
  it('pause without away shifts by the pause time only', () => {
    const patch = computeResumePatch({ until: '2026-10-16', since: TUE }, { t1: task }, { Bo: { name: 'Bo' } }, FRI);
    expect(patch['tasks/t1/lastDone'] - LAST).toBe(87 * H);
  });
});

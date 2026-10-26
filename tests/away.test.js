import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state, applySnapshot } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import * as fb from '../src/firebase.js';
import { checkTaskResets } from '../src/tasks.js';
import { dueStatus, nextRotationPerson, awayText, setAwayMembers } from '../src/utils.js';
import { selectNotifyTasks } from '../src/notifications.js';
import { tvStripHTML } from '../src/tv.js';
import { setAway, clearAway, checkAwayExpiry, computeReturnPatch, awayAdminHTML } from '../src/away.js';

const DAY = 86400000;
const NOW = new Date(2026, 9, 14, 12, 0, 0).getTime(); // Wed 14 Oct 2026
const admin = () => true, member = () => false;
const mk = (o = {}) => ({ id: 't1', name: 'Bins', freq: 'weekly', done: false, lastDone: NOW - 20 * DAY, person: 'Bo', ...o });
const bo = (o = {}) => ({ name: 'Bo', role: 'member', lastStreakDate: '2026-10-01', streak: 5, ...o });

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW);
  Object.assign(state, { members: { Al: { name: 'Al', role: 'admin' }, Bo: bo() }, tasks: {}, pause: null });
  setAwayMembers(state.members);
});
afterEach(() => vi.useRealTimers());

describe('due status while away', () => {
  it('assigned chores are ok while away, overdue again after', () => {
    expect(dueStatus(mk())).toBe('overdue');
    setAwayMembers({ Bo: bo({ awayUntil: '2026-10-14' }) });
    expect(dueStatus(mk())).toBe('ok');
    setAwayMembers({ Bo: bo({ awayUntil: '2026-10-13' }) });
    expect(dueStatus(mk())).toBe('overdue');
  });
  it('other people and Anyone chores are unaffected', () => {
    setAwayMembers({ Bo: bo({ awayUntil: '2026-10-20' }) });
    expect(dueStatus(mk({ person: 'Al' }))).toBe('overdue');
    expect(dueStatus(mk({ person: '' }))).toBe('overdue');
  });
  it('notifications skip the away member', () => {
    const tasks = { t1: mk() };
    expect(selectNotifyTasks(tasks, 'Bo')).toHaveLength(1);
    setAwayMembers({ Bo: bo({ awayUntil: '2026-10-20' }) });
    expect(selectNotifyTasks(tasks, 'Bo')).toHaveLength(0);
  });
  it('applySnapshot arms it from the members', () => {
    applySnapshot({ members: { Bo: bo({ awayUntil: '2026-10-20' }) } });
    expect(dueStatus(mk())).toBe('ok');
    applySnapshot({ members: { Bo: bo() } });
    expect(dueStatus(mk())).toBe('overdue');
  });
});

describe('rotation skips the away member', () => {
  const MEM = ['Ann', 'Bo', 'Cy'];
  it('skips to the next present member', () => {
    expect(nextRotationPerson(['Ann', 'Bo', 'Cy'], 'Ann', MEM, ['Bo'])).toBe('Cy');
    expect(nextRotationPerson(['Ann', 'Bo', 'Cy'], 'Cy', MEM, ['Ann'])).toBe('Bo');
  });
  it('returns null when everyone else is away', () => {
    expect(nextRotationPerson(['Ann', 'Bo'], 'Ann', MEM, ['Bo'])).toBeNull();
  });
  it('reset hands the chore past an away member', () => {
    state.members = { Ann: { name: 'Ann' }, Bo: bo({ awayUntil: '2026-10-20' }), Cy: { name: 'Cy' } };
    setAwayMembers(state.members);
    state.tasks = { t1: mk({ person: 'Ann', done: true, rotation: ['Ann', 'Bo', 'Cy'], lastDone: NOW - 10 * DAY }) };
    checkTaskResets();
    expect(state.tasks.t1.person).toBe('Cy');
    expect(fb.patchRoot.mock.calls[0][0]['tasks/t1/person']).toBe('Cy');
  });
});

describe('streak preserved on return', () => {
  const since = NOW - 7 * DAY; // Wed 7 Oct
  it('shifts lastStreakDate and recurring chores by the time away', () => {
    const m = bo({ awaySince: since, lastStreakDate: '2026-10-05' });
    const p = computeReturnPatch(m, { t1: mk({ lastDone: since - 3 * DAY }), t2: mk({ id: 't2', person: 'Al', lastDone: since - DAY }), o: mk({ id: 'o', freq: 'once', lastDone: since - DAY }) }, NOW);
    expect(p['members/Bo/awayUntil']).toBeNull();
    expect(p['members/Bo/awaySince']).toBeNull();
    expect(p['members/Bo/lastStreakDate']).toBe('2026-10-12');
    expect(p['tasks/t1/lastDone']).toBe(since - 3 * DAY + 7 * DAY);
    expect(p['tasks/t2/lastDone']).toBeUndefined();
    expect(p['tasks/o/lastDone']).toBeUndefined();
  });
  it('never shifts into the future and leaves streak days earned while away', () => {
    expect(computeReturnPatch(bo({ awaySince: since, lastStreakDate: '2026-10-12' }), {}, NOW)['members/Bo/lastStreakDate']).toBeUndefined();
    expect(computeReturnPatch(bo({ awaySince: since, lastStreakDate: '2026-10-06' }), {}, NOW)['members/Bo/lastStreakDate']).toBe('2026-10-13');
  });
  it('without awaySince only clears the fields', () => {
    expect(Object.keys(computeReturnPatch(bo(), {}, NOW)).sort()).toEqual(['members/Bo/awaySince', 'members/Bo/awayUntil']);
  });
});

describe('auto-expiry', () => {
  it('ends an expired away period with one multi-path update; an active one is left alone', async () => {
    state.members.Bo = bo({ awayUntil: '2026-10-14', awaySince: NOW - 5 * DAY });
    checkAwayExpiry();
    expect(fb.patchPaths).not.toHaveBeenCalled();
    state.members.Bo = bo({ awayUntil: '2026-10-13', awaySince: NOW - 5 * DAY });
    checkAwayExpiry(); checkAwayExpiry(); // second call is deduped while the write is in flight
    await Promise.resolve();
    expect(fb.patchPaths).toHaveBeenCalledTimes(1);
    expect(fb.patchPaths.mock.calls[0][0]['members/Bo/awayUntil']).toBeNull();
  });
});

describe('set / clear guards', () => {
  it('admin sets awayUntil and awaySince on that member only', async () => {
    expect(await setAway('Bo', '2026-10-20', admin)).toBe(true);
    expect(fb.patchMember).toHaveBeenCalledWith('Bo', { awayUntil: '2026-10-20', awaySince: NOW });
    expect(state.members.Bo.awayUntil).toBe('2026-10-20');
  });
  it('today is allowed; past, malformed and unknown members are rejected', async () => {
    expect(await setAway('Bo', '2026-10-14', admin)).toBe(true);
    expect(await setAway('Bo', '2026-10-13', admin)).toBe(false);
    expect(await setAway('Bo', 'soon', admin)).toBe(false);
    expect(await setAway('Nobody', '2026-10-20', admin)).toBe(false);
    expect(fb.patchMember).toHaveBeenCalledTimes(1);
  });
  it('member cannot set or clear', async () => {
    state.members.Bo.awayUntil = '2026-10-20';
    expect(await setAway('Bo', '2026-10-20', member)).toBe(false);
    expect(await clearAway('Bo', member)).toBe(false);
    expect(fb.patchMember).not.toHaveBeenCalled();
    expect(fb.patchPaths).not.toHaveBeenCalled();
  });
  it('admin clears early', async () => {
    state.members.Bo = bo({ awayUntil: '2026-10-20', awaySince: NOW - DAY });
    expect(await clearAway('Bo', admin)).toBe(true);
    expect(fb.patchPaths.mock.calls[0][0]['members/Bo/awayUntil']).toBeNull();
    expect(state.members.Bo.awayUntil).toBeUndefined();
  });
});

describe('display', () => {
  it('chip text, hidden when not away or past', () => {
    expect(awayText({ awayUntil: '2026-10-16' })).toBe('🏕 away until ' + new Date(2026, 9, 16).toLocaleDateString([], { weekday: 'short' }));
    expect(awayText(bo())).toBe('');
    expect(awayText({ awayUntil: '2026-10-13' })).toBe('');
  });
  it('TV strip shows it', () => {
    expect(tvStripHTML({ Bo: bo({ awayUntil: '2026-10-16' }) }, [])).toContain('🏕 away until');
    expect(tvStripHTML({ Bo: bo() }, [])).not.toContain('🏕');
  });
  it('admin form escapes member names', () => {
    state.members = { 'A"><b>': { name: 'A"><b>', role: 'member' } };
    expect(awayAdminHTML()).not.toContain('"><b>');
  });
});

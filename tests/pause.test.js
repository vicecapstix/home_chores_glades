import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state, applySnapshot } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import * as fb from '../src/firebase.js';
import { checkTaskResets } from '../src/tasks.js';
import { dueStatus, setPauseUntil } from '../src/utils.js';
import { selectNotifyTasks } from '../src/notifications.js';
import { computeResumePatch, setPause, clearPause, checkPauseExpiry, pauseText } from '../src/pause.js';

const DAY = 86400000;
const NOW = new Date(2026, 9, 14, 12, 0, 0).getTime(); // Wed 14 Oct 2026 local
const admin = () => true, member = () => false, me = () => 'Al';
const mk = (o = {}) => ({ id: 't1', name: 'Bins', freq: 'weekly', done: false, lastDone: NOW - 20 * DAY, person: 'Al', ...o });

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW);
  Object.assign(state, { members: { Al: { name: 'Al', role: 'admin', lastStreakDate: '2026-10-01', streak: 5 } }, tasks: {}, pause: null });
  setPauseUntil('');
});
afterEach(() => vi.useRealTimers());

describe('paused behaviour (#70)', () => {
  it('dueStatus is ok while paused, overdue again after', () => {
    const t = mk();
    expect(dueStatus(t)).toBe('overdue');
    setPauseUntil('2026-10-14');
    expect(dueStatus(t)).toBe('ok');
    setPauseUntil('2026-10-13');
    expect(dueStatus(t)).toBe('overdue');
  });
  it('notifications see nothing overdue while paused', () => {
    const tasks = { t1: mk() };
    expect(selectNotifyTasks(tasks, 'Al')).toHaveLength(1);
    setPauseUntil('2026-10-20');
    expect(selectNotifyTasks(tasks, 'Al')).toHaveLength(0);
  });
  it('applySnapshot loads pause and arms dueStatus', () => {
    applySnapshot({ pause: { until: '2026-10-20', by: 'Al', since: NOW } });
    expect(state.pause.until).toBe('2026-10-20');
    expect(dueStatus(mk())).toBe('ok');
    applySnapshot({});
    expect(state.pause).toBeNull();
    expect(dueStatus(mk())).toBe('overdue');
  });
  it('checkTaskResets does not reset while paused', () => {
    state.tasks = { t1: mk({ done: true }) };
    state.pause = { until: '2026-10-20', since: NOW };
    checkTaskResets();
    expect(state.tasks.t1.done).toBe(true);
    expect(fb.patchRoot).not.toHaveBeenCalled();
    state.pause = null;
    checkTaskResets();
    expect(state.tasks.t1.done).toBe(false);
  });
  it('banner text', () => {
    expect(pauseText({ until: '2026-10-25' })).toMatch(/Paused until .*25/);
    expect(pauseText(null)).toBe('');
  });
});

describe('setPause / clearPause guards', () => {
  it('admin sets a pause with one patchRoot', async () => {
    await setPause('2026-10-20', admin, me);
    expect(fb.patchRoot).toHaveBeenCalledWith({ pause: { until: '2026-10-20', by: 'Al', since: NOW } });
    expect(state.pause.until).toBe('2026-10-20');
  });
  it('member cannot set or clear', async () => {
    await setPause('2026-10-20', member, me);
    state.pause = { until: '2026-10-20', since: NOW };
    await clearPause(member);
    expect(fb.patchRoot).not.toHaveBeenCalled();
  });
  it('rejects past or malformed dates', async () => {
    await setPause('2026-10-13', admin, me);
    await setPause('soon', admin, me);
    expect(fb.patchRoot).not.toHaveBeenCalled();
  });
});

describe('resume', () => {
  const since = NOW - 7 * DAY; // Wed 7 Oct
  it('shifts recurring lastDone and streak dates, leaves others', () => {
    const tasks = {
      t1: mk({ lastDone: since - 3 * DAY }),
      once: mk({ id: 'once', freq: 'once', lastDone: since - DAY }),
      during: mk({ id: 'during', lastDone: since + DAY }),
      never: mk({ id: 'never', lastDone: 0 }),
    };
    const p = computeResumePatch({ until: '2026-10-13', since }, tasks, state.members, NOW);
    expect(p.pause).toBeNull();
    expect(p['tasks/t1/lastDone']).toBe(since - 3 * DAY + 7 * DAY);
    expect(Object.keys(p).filter(k => k.startsWith('tasks/'))).toEqual(['tasks/t1/lastDone']);
    expect(p['members/Al/lastStreakDate']).toBe('2026-10-08');
  });
  it('leaves streak dates earned during the pause alone', () => {
    const p = computeResumePatch({ until: '2026-10-13', since }, {}, { Al: { name: 'Al', lastStreakDate: '2026-10-12' } }, NOW);
    expect(p['members/Al/lastStreakDate']).toBeUndefined();
  });
  it('clearPause writes a single multi-path update', async () => {
    state.tasks = { t1: mk({ lastDone: since - DAY }) };
    state.pause = { until: '2026-10-20', since };
    await clearPause(admin);
    expect(fb.patchRoot).toHaveBeenCalledTimes(1);
    expect(fb.patchRoot.mock.calls[0][0].pause).toBeNull();
    expect(state.pause).toBeNull();
  });
  it('expired pause resumes automatically; active one does not', async () => {
    state.tasks = { t1: mk({ lastDone: since - DAY }) };
    state.pause = { until: '2026-10-14', since };
    checkPauseExpiry();
    expect(fb.patchRoot).not.toHaveBeenCalled();
    state.pause = { until: '2026-10-13', since };
    checkPauseExpiry();
    await Promise.resolve();
    expect(fb.patchRoot).toHaveBeenCalledTimes(1);
    const p = fb.patchRoot.mock.calls[0][0];
    expect(p.pause).toBeNull();
    expect(p['tasks/t1/lastDone']).toBeGreaterThan(since - DAY);
  });
});

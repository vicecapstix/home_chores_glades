import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import * as fb from '../src/firebase.js';
import { pushUndo } from '../src/undo.js';
import { skipTask } from '../src/tasks.js';
import { dueStatus, isSkipped } from '../src/utils.js';
import { cardHTML } from '../src/render.js';

const NOW = new Date(2026, 9, 14, 12, 0, 0).getTime(); // Wed 14 Oct 2026, local
const DAY = 86400000;
const admin = () => true, member = () => false;
const mk = (o = {}) => ({ id: 't1', name: 'Wash car', freq: 'weekly', done: false, lastDone: NOW - 8 * DAY,
  person: 'Al', difficulty: 'easy', lastDoneBy: 'Bo', lastDonePoints: 3, subtasks: {}, order: 1, ...o });

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.members = { Al: { name: 'Al', role: 'admin', points: 5 } };
  state.history = [];
});
afterEach(() => vi.useRealTimers());

describe('skipTask (#92)', () => {
  for (const [freq, extra] of [['daily', {}], ['weekly', {}], ['fortnightly', {}], ['monthly', {}], ['weekdays', { days: [1, 3] }]]) {
    it(`${freq}: writes only lastDone + skippedAt`, async () => {
      state.tasks = { t1: mk({ freq, ...extra }) };
      await skipTask('t1', admin);
      expect(fb.patchTask).toHaveBeenCalledTimes(1);
      expect(fb.patchTask).toHaveBeenCalledWith('t1', { lastDone: NOW, skippedAt: NOW });
      expect(fb.patchMember).not.toHaveBeenCalled();
      expect(fb.patchRoot).not.toHaveBeenCalled();
      expect(fb.writeState).not.toHaveBeenCalled();
      expect(state.tasks.t1.lastDoneBy).toBe('Bo');
      expect(state.members.Al.points).toBe(5);
      expect(state.history).toEqual([]);
    });
  }

  it('refuses members, once-chores and done chores', async () => {
    state.tasks = { t1: mk(), t2: mk({ id: 't2', freq: 'once' }), t3: mk({ id: 't3', done: true }) };
    await skipTask('t1', member);
    await skipTask('t2', admin);
    await skipTask('t3', admin);
    await skipTask('nope', admin);
    expect(fb.patchTask).not.toHaveBeenCalled();
  });

  it('undo restores the previous lastDone and clears skippedAt', async () => {
    state.tasks = { t1: mk() };
    const prev = state.tasks.t1.lastDone;
    await skipTask('t1', admin);
    expect(pushUndo).toHaveBeenCalledTimes(1);
    await pushUndo.mock.calls[0][0].undo();
    expect(fb.patchTask).toHaveBeenLastCalledWith('t1', { lastDone: prev, skippedAt: null });
    expect(state.tasks.t1.lastDone).toBe(prev);
    expect(isSkipped(state.tasks.t1)).toBe(false);
  });

  it('does not write if the patch fails', async () => {
    fb.patchTask.mockRejectedValueOnce(new Error('x'));
    state.tasks = { t1: mk() };
    const prev = state.tasks.t1.lastDone;
    await skipTask('t1', admin);
    expect(state.tasks.t1.lastDone).toBe(prev);
    expect(pushUndo).not.toHaveBeenCalled();
  });
});

describe('dueStatus for skipped chores', () => {
  it('an overdue weekly chore is ok after a skip', () => {
    const t = mk();
    expect(dueStatus(t)).toBe('overdue');
    expect(dueStatus({ ...t, lastDone: NOW, skippedAt: NOW })).toBe('ok');
  });
  it('a daily chore is ok (not "soon") while skipped', () => {
    expect(dueStatus({ ...mk({ freq: 'daily' }), lastDone: NOW, skippedAt: NOW })).toBe('ok');
  });
  it('becomes overdue again a full period later', () => {
    const t = { ...mk(), lastDone: NOW - 8 * DAY, skippedAt: NOW - 8 * DAY };
    expect(dueStatus(t)).toBe('overdue');
  });
  it('weekday chore is ok until its next scheduled day', () => {
    const t = mk({ freq: 'weekdays', days: [1, 3], lastDone: NOW - 3 * DAY });
    expect(dueStatus(t)).not.toBe('ok');
    expect(dueStatus({ ...t, lastDone: NOW, skippedAt: NOW })).toBe('ok');
  });
  it('ticking later ends the skipped state', () => {
    expect(isSkipped({ ...mk(), lastDone: NOW + 1000, skippedAt: NOW })).toBe(false);
    expect(isSkipped({ ...mk({ done: true }), lastDone: NOW, skippedAt: NOW })).toBe(false);
  });
});

describe('card', () => {
  it('shows "Skipped today" and no "On track"', () => {
    const html = cardHTML({ ...mk(), lastDone: NOW, skippedAt: NOW });
    expect(html).toContain('Skipped today');
    expect(html).not.toContain('On track');
  });
  it('has a skip button for recurring chores only', () => {
    expect(cardHTML(mk())).toContain('window.skipTask');
    expect(cardHTML(mk({ freq: 'once', dueDate: '2026-10-20' }))).not.toContain('window.skipTask');
    expect(cardHTML(mk({ done: true }))).not.toContain('window.skipTask');
  });
  it('escapes the task name in the skip button label', () => {
    expect(cardHTML(mk({ name: '<img onerror=x>' }))).not.toContain('<img onerror=x>');
  });
});

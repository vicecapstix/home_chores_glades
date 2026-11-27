import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  patchPaths: vi.fn().mockResolvedValue(undefined), removeTask: vi.fn().mockResolvedValue(undefined),
  restoreTask: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn(), resetTasks: vi.fn(),
  takeCheckPending: vi.fn(), adjustMemberPoints: vi.fn(), appendHistory: vi.fn(), removeHistoryEntry: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchPaths, removeTask } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { pushUndo } from '../src/undo.js';
import { duplicateTask, editTask } from '../src/tasks.js';

const admin = () => true;
const notAdmin = () => false;
const src = () => ({
  id: 't1', name: 'Make bed', freq: 'weekdays', days: [1, 3], everyWeeks: 2, weekAnchor: '2026-11-23', person: 'Amy', difficulty: 'hard',
  category: 'Bedroom', notes: 'Hospital corners', dueTime: '08:00', icon: '🧹', pointsOverride: 4, minutes: 5, timeOfDay: 'morning',
  needsCheck: true, rotation: ['Amy', 'Bo'], order: 1,
  done: true, lastDone: 111, lastDoneBy: 'Amy', lastDonePoints: 4, lastDoneBadges: ['first'], lastDoneAt: 111, lastDoneWeek: '2026-11-23',
  prevLastDone: 5, prevStreak: 2, prevStreakDate: '2026-11-26', prevFreezes: 1, skippedAt: 99,
  checkPending: { by: 'Amy', at: 5 }, checkNote: 'redo',
  subtasks: { s1: { id: 's1', name: 'Pillows', done: true }, s2: { id: 's2', name: 'Sheet', done: false } },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-27T10:00:00'));
  state.tasks = { t1: src() };
  state.nextId = 7;
});
afterEach(() => vi.useRealTimers());

describe('duplicate a chore (#405)', () => {
  it('copies the settings, names it " (copy)" and clears the done state, history links and parent check', async () => {
    await duplicateTask('t1', admin);
    const [id] = Object.keys(state.tasks).filter(k => k !== 't1');
    const c = state.tasks[id];
    expect(c.name).toBe('Make bed (copy)');
    expect(c).toMatchObject({ freq: 'weekdays', days: [1, 3], everyWeeks: 2, person: 'Amy', difficulty: 'hard', category: 'Bedroom', notes: 'Hospital corners', dueTime: '08:00', icon: '🧹', pointsOverride: 4, minutes: 5, timeOfDay: 'morning', needsCheck: true, rotation: ['Amy', 'Bo'] });
    expect(c.id).toBe(id);
    expect(c.done).toBe(false);
    for (const f of ['lastDoneBy', 'lastDonePoints', 'lastDoneBadges', 'lastDoneAt', 'lastDoneWeek', 'prevLastDone', 'prevStreak', 'prevStreakDate', 'prevFreezes', 'skippedAt', 'checkPending', 'checkNote']) expect(c).not.toHaveProperty(f);
    expect(Object.values(c.subtasks).map(s => [s.name, s.done])).toEqual([['Pillows', false], ['Sheet', false]]);
    expect(Object.keys(c.subtasks)).not.toContain('s1');
  });
  it('leaves the original chore untouched', async () => {
    await duplicateTask('t1', admin);
    expect(state.tasks.t1).toEqual(src());
  });
  it('writes the task and nextId in one multi-path add', async () => {
    await duplicateTask('t1', admin);
    expect(patchPaths).toHaveBeenCalledTimes(1);
    const paths = patchPaths.mock.calls[0][0];
    const [id] = Object.keys(state.tasks).filter(k => k !== 't1');
    expect(Object.keys(paths).sort()).toEqual(['nextId', 'tasks/' + id].sort());
    expect(paths.nextId).toBe(8);
  });
  it('keeps the name within 60 characters', async () => {
    state.tasks.t1.name = 'x'.repeat(60);
    await duplicateTask('t1', admin);
    const [id] = Object.keys(state.tasks).filter(k => k !== 't1');
    expect(state.tasks[id].name.length).toBe(60);
  });
  it('undo removes the copy', async () => {
    await duplicateTask('t1', admin);
    const [id] = Object.keys(state.tasks).filter(k => k !== 't1');
    expect(pushUndo).toHaveBeenCalledTimes(1);
    await pushUndo.mock.calls[0][0].undo();
    expect(removeTask).toHaveBeenCalledWith(id);
  });
  it('is blocked for a non-admin', async () => {
    await duplicateTask('t1', notAdmin);
    expect(patchPaths).not.toHaveBeenCalled();
    expect(Object.keys(state.tasks)).toEqual(['t1']);
  });
  it('ignores an unknown chore', async () => {
    await duplicateTask('nope', admin);
    expect(patchPaths).not.toHaveBeenCalled();
  });
  it('toasts and rolls back the local copy when the save fails', async () => {
    patchPaths.mockRejectedValueOnce(new Error('boom'));
    await duplicateTask('t1', admin);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(Object.keys(state.tasks)).toEqual(['t1']);
    expect(state.nextId).toBe(7);
  });
  it('the edit view has a Copy button wired to duplicateTask, with the id escaped', () => {
    state.tasks.t1.id = "t1'x";
    document.body.innerHTML = '<div id="tc-t1\'x"></div>';
    state.tasks["t1'x"] = state.tasks.t1;
    editTask("t1'x", admin);
    const btn = [...document.querySelectorAll('.edit-actions button')].find(b => b.textContent === 'Copy');
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('onclick')).toContain('window.duplicateTask(');
    expect(btn.getAttribute('onclick')).not.toContain("t1'x");
  });
});

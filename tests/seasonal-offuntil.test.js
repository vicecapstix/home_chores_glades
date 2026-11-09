import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

const cfg = vi.hoisted(() => ({ ro: false }));
vi.mock('../src/config.js', async orig => ({ ...(await orig()), get READONLY() { return cfg.ro; } }));
vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn(), patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn().mockResolvedValue(undefined), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { patchPaths, patchRoot } from '../src/firebase.js';
import { dueStatus, localDateStr } from '../src/utils.js';
import { cardHTML } from '../src/render.js';
import { saveTask, checkTaskResets } from '../src/tasks.js';
import { checkOffExpiry } from '../src/seasonal.js';

const DAY = 86400000;
const NOW = new Date(2026, 5, 10, 12).getTime(); // 10 Jun 2026, noon
const day = n => localDateStr(new Date(NOW + n * DAY));
const lawn = { id: 'lawn', name: 'Mow lawn', freq: 'weekly', difficulty: 'easy', person: '', done: false, lastDone: NOW - 30 * DAY, subtasks: {} };
const admin = () => true, notAdmin = () => false;

beforeEach(() => {
  vi.clearAllMocks(); cfg.ro = false;
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.members = { Ann: { name: 'Ann', role: 'admin' } }; state.tasks = {}; state.pause = null;
  document.body.innerHTML = '<div id="toast"></div>';
});

describe('off chores are not due (#300)', () => {
  it('overdue without offUntil, ok through the date, overdue again after', () => {
    expect(dueStatus(lawn, NOW)).toBe('overdue');
    expect(dueStatus({ ...lawn, offUntil: day(0) }, NOW)).toBe('ok');
    expect(dueStatus({ ...lawn, offUntil: day(30) }, NOW)).toBe('ok');
    expect(dueStatus({ ...lawn, offUntil: day(-1) }, NOW)).toBe('soon'); // expired: shown as due that day, not overdue (#308)
  });
  it('a malformed offUntil is ignored', () => {
    expect(dueStatus({ ...lawn, offUntil: 'soon' }, NOW)).toBe('overdue');
  });
  it('daily resets skip an off chore', () => {
    state.tasks = { lawn: { ...lawn, done: true, lastDone: NOW - 30 * DAY, lastDoneBy: 'Ann', offUntil: day(5) } };
    checkTaskResets();
    expect(state.tasks.lawn.done).toBe(true);
    expect(patchRoot).not.toHaveBeenCalled();
  });
});

describe('switch off from the edit form (#300)', () => {
  function editCard(v) {
    state.tasks.lawn = { ...lawn, offUntil: day(3) };
    document.body.innerHTML = '<div id="tc-lawn"><input class="edit-name" value="Mow lawn"><select class="edit-freq"><option value="weekly" selected></option></select>' +
      '<div class="edit-days"></div><input class="edit-interval"><input class="edit-duedate"><input class="edit-duetime"><select class="edit-diff"><option value="easy" selected></option></select>' +
      '<select class="edit-cat"><option value="" selected></option></select><select class="edit-person"><option value="" selected></option></select>' +
      '<input type="date" class="edit-offuntil"><textarea class="edit-notes"></textarea></div>';
    document.querySelector('.edit-offuntil').value = v;
  }
  it('admin saves a future date; empty, past or malformed clears it', async () => {
    editCard(day(20)); await saveTask('lawn', admin);
    expect(patchPaths.mock.calls[0][0]['tasks/lawn/offUntil']).toBe(day(20));
    editCard(''); await saveTask('lawn', admin);
    expect(patchPaths.mock.calls[1][0]['tasks/lawn/offUntil']).toBeNull();
    editCard(day(-2)); await saveTask('lawn', admin);
    expect(patchPaths.mock.calls[2][0]['tasks/lawn/offUntil']).toBeNull();
    editCard('nope'); await saveTask('lawn', admin);
    expect(patchPaths.mock.calls[3][0]['tasks/lawn/offUntil']).toBeNull();
  });
  it('non-admin and READONLY write nothing', async () => {
    editCard(day(20)); await saveTask('lawn', notAdmin);
    cfg.ro = true; await saveTask('lawn', admin);
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('automatic switch-back (#300)', () => {
  it('after the date, one patch clears offUntil and makes it due that day', () => {
    state.tasks = { lawn: { ...lawn, done: false, offUntil: day(-1) }, ok: { ...lawn, id: 'ok', offUntil: day(4) } };
    checkOffExpiry(NOW);
    expect(patchPaths).toHaveBeenCalledOnce();
    const p = patchPaths.mock.calls[0][0];
    expect(Object.keys(p).sort()).toEqual(['tasks/lawn/lastDone', 'tasks/lawn/offUntil']);
    expect(p['tasks/lawn/offUntil']).toBeNull();
    expect(p['tasks/lawn/lastDone']).toBeLessThanOrEqual(NOW - 7 * DAY + 1000);
    expect(state.tasks.lawn.offUntil).toBeUndefined();
    expect(state.tasks.ok.offUntil).toBe(day(4));
  });
  it('does nothing while still off, on the last day, or with no off chores', () => {
    state.tasks = { lawn: { ...lawn, offUntil: day(0) } };
    checkOffExpiry(NOW);
    state.tasks = { lawn };
    checkOffExpiry(NOW);
    expect(patchPaths).not.toHaveBeenCalled();
  });
  it('a one-off chore keeps its lastDone (only offUntil is cleared)', () => {
    state.tasks = { once: { ...lawn, id: 'once', freq: 'once', dueDate: day(9), offUntil: day(-1) } };
    checkOffExpiry(NOW);
    expect(Object.keys(patchPaths.mock.calls[0][0])).toEqual(['tasks/once/offUntil']);
  });
  it('READONLY (TV) never writes', () => {
    cfg.ro = true;
    state.tasks = { lawn: { ...lawn, offUntil: day(-1) } };
    checkOffExpiry(NOW);
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('card tag (#300)', () => {
  it('shows a muted Off until tag while off, and none otherwise', () => {
    expect(cardHTML({ ...lawn, offUntil: day(10) })).toContain('Off until');
    expect(cardHTML(lawn)).not.toContain('Off until');
    expect(cardHTML({ ...lawn, offUntil: day(-3) })).not.toContain('Off until');
    expect(cardHTML({ ...lawn, offUntil: '<img src=x onerror=alert(1)>' })).not.toContain('onerror');
  });
  it('TV (READONLY) shows the tag', () => {
    cfg.ro = true;
    expect(cardHTML({ ...lawn, offUntil: day(10) })).toContain('Off until');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

const cfg = vi.hoisted(() => ({ ro: false }));
vi.mock('../src/config.js', async orig => ({ ...(await orig()), get READONLY() { return cfg.ro; } }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn().mockResolvedValue(undefined), patchMember: vi.fn(), patchRoot: vi.fn().mockResolvedValue(undefined),
  patchPaths: vi.fn().mockResolvedValue(undefined), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
  adjustMemberPoints: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchPaths, patchTask, patchRoot } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { initRender, renderTasks, renderFilters, renderHeader } from '../src/render.js';
import { toggleTask } from '../src/tasks.js';
import { switchOnNow } from '../src/seasonal.js';
import { todayProgress, weekPlan } from '../src/utils.js';
import { selectNotifyTasks } from '../src/notifications.js';
import { chartRows } from '../src/printchart.js';

const NOW = new Date(2026, 5, 10, 12).getTime(); // Wed 10 Jun 2026
const mk = (id, o = {}) => ({ id, name: id, freq: 'daily', difficulty: 'easy', person: 'Al', done: false, lastDone: NOW - 5 * 86400000, subtasks: {}, ...o });
const off = (id, o = {}) => mk(id, { offUntil: '2026-09-01', ...o });
const admin = () => true, member = () => false;

beforeEach(() => {
  vi.clearAllMocks(); cfg.ro = false;
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.members = { Al: { name: 'Al', role: 'admin' }, Bo: { name: 'Bo', role: 'member' } };
  state.tasks = { on: mk('on'), pool: off('pool', { freq: 'weekly' }) };
  state.pause = null;
  document.body.innerHTML = '<div id="filters"></div><div id="task-list"></div>';
  initRender(admin, () => 'Al');
});
afterEach(() => vi.useRealTimers());

describe('Off section (#301)', () => {
  it('off chores sit in a collapsed "Off (N)" section, not in the due sections', () => {
    renderTasks();
    const sec = document.querySelector('details.off-chores');
    expect(sec).toBeTruthy();
    expect(sec.hasAttribute('open')).toBe(false);
    expect(sec.querySelector('summary').textContent).toContain('Off (1)');
    expect(sec.querySelector('#tc-pool')).toBeTruthy();
    expect(document.querySelectorAll('#tc-pool').length).toBe(1);
    expect(document.querySelector('.section[data-k] #tc-pool')).toBeNull();
    expect(document.querySelector('#tc-on')).toBeTruthy();
  });
  it('no Off section when nothing is switched off', () => {
    state.tasks = { on: mk('on') };
    renderTasks();
    expect(document.querySelector('details.off-chores')).toBeNull();
  });
  it('admin gets a "Switch on now" button; a member does not', () => {
    renderTasks();
    expect(document.querySelector('details.off-chores button[onclick*="switchOnNow"]')).toBeTruthy();
    initRender(member, () => 'Bo');
    renderTasks();
    expect(document.querySelector('details.off-chores button[onclick*="switchOnNow"]')).toBeNull();
  });
  it('off chores cannot be ticked from the card (checkbox disabled)', () => {
    renderTasks();
    const box = document.querySelector('#tc-pool .check');
    expect(box.disabled).toBe(true);
    expect(box.getAttribute('onclick') || '').not.toContain('toggleTask');
  });
  it('readonly TV shows the same layout with no controls', () => {
    cfg.ro = true;
    renderTasks();
    expect(document.querySelector('details.off-chores summary').textContent).toContain('Off (1)');
    expect(document.querySelector('details.off-chores button[onclick*="switchOnNow"]')).toBeNull();
  });
  it('header total, done and percent leave off chores out', () => {
    state.tasks = { a: mk('a', { done: true }), b: mk('b'), pool: off('pool'), pool2: off('pool2', { done: true }) };
    document.body.innerHTML = '<b id="h-total"></b><b id="h-done"></b><b id="h-overdue"></b><b id="h-pct"></b><i id="prog"></i>';
    renderHeader();
    expect(document.getElementById('h-total').textContent).toBe('2');
    expect(document.getElementById('h-done').textContent).toBe('1');
    expect(document.getElementById('h-pct').textContent).toBe('50%');
  });
  it('filter pill counts leave off chores out', () => {
    renderFilters();
    const all = [...document.querySelectorAll('#filters .filter-pill')].find(b => b.textContent.startsWith('All'));
    expect(all.querySelector('.count').textContent).toBe('1');
  });
});

describe('Off chores are left out of the family numbers (#301)', () => {
  it('daily goal ignores an off chore, even one ticked today', () => {
    state.tasks = { on: mk('on'), pool: off('pool', { done: true, lastDone: NOW - 1000 }) };
    expect(todayProgress(Object.values(state.tasks), NOW)).toEqual({ done: 0, total: 1 });
  });
  it('week planner ignores off chores', () => {
    const items = weekPlan(state.tasks, NOW).flatMap(d => d.items.map(i => i.id));
    expect(items).toContain('on');
    expect(items).not.toContain('pool');
  });
  it('print chart ignores off chores', () => {
    const ids = chartRows(state.tasks, ['Al'], '2026-06-08').flatMap(g => g.rows.map(r => r.task.id));
    expect(ids).toContain('on');
    expect(ids).not.toContain('pool');
  });
  it('notifications never list an off chore', () => {
    state.tasks = { pool: off('pool', { freq: 'weekly', lastDone: NOW - 30 * 86400000 }) };
    expect(selectNotifyTasks(state.tasks, 'Al')).toEqual([]);
  });
});

describe('ticking and early switch-on (#301)', () => {
  it('toggleTask refuses an off chore', async () => {
    await toggleTask('pool', () => 'Al', admin);
    expect(patchTask).not.toHaveBeenCalled();
    expect(patchRoot).not.toHaveBeenCalled();
    expect(state.tasks.pool.done).toBe(false);
    expect(showToast).toHaveBeenCalled();
  });
  it('admin switches a chore on early: offUntil removed, due that day', async () => {
    await switchOnNow('pool', admin);
    expect(patchPaths).toHaveBeenCalledTimes(1);
    const p = patchPaths.mock.calls[0][0];
    expect(p['tasks/pool/offUntil']).toBeNull();
    expect(typeof p['tasks/pool/lastDone']).toBe('number');
    expect(state.tasks.pool.offUntil).toBeUndefined();
  });
  it('a done chore keeps lastDone when switched on early', async () => {
    state.tasks.pool.done = true;
    await switchOnNow('pool', admin);
    expect(patchPaths.mock.calls[0][0]).toEqual({ 'tasks/pool/offUntil': null });
  });
  it('non-admin, READONLY, unknown or not-off chores write nothing', async () => {
    await switchOnNow('pool', member);
    await switchOnNow('nope', admin);
    await switchOnNow('on', admin);
    cfg.ro = true;
    await switchOnNow('pool', admin);
    expect(patchPaths).not.toHaveBeenCalled();
    expect(state.tasks.pool.offUntil).toBe('2026-09-01');
  });
  it('a failed save shows a toast', async () => {
    patchPaths.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'PERMISSION_DENIED' }));
    await switchOnNow('pool', admin);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Save failed'));
  });
});

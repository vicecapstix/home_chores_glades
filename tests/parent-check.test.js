import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchMember: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
  patchTask: vi.fn(async (id, f) => { Object.assign(state.tasks[id], f); }),
  takeCheckPending: vi.fn(async id => { const p = state.tasks[id].checkPending || null; if (p) state.tasks[id].checkPending = null; return p; }),
  adjustMemberPoints: vi.fn().mockResolvedValue({ ok: true, reason: '' }),
  appendHistory: vi.fn().mockResolvedValue(undefined), removeHistoryEntry: vi.fn().mockResolvedValue({ removed: false }),
}));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchTask, patchPaths, takeCheckPending, adjustMemberPoints, appendHistory, patchMember } from '../src/firebase.js';
import { toggleTask, approveCheck, sendBackCheck, addTask, saveTask } from '../src/tasks.js';
import { cardHTML as renderCard, initRender } from '../src/render.js';
import { dueStatus, taskPoints } from '../src/utils.js';

const NOW = new Date(2026, 9, 27, 12).getTime();
const TICK = NOW - 3600000;
const as = (name, adminFlag) => ({ me: () => name, adm: () => adminFlag });
const mkTask = (o = {}) => ({ id: 'a', name: 'Bathroom', freq: 'weekly', person: 'Bo', done: false, lastDone: NOW - 10 * 86400000, difficulty: 'medium', needsCheck: true, ...o });

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.members = { Ann: { name: 'Ann', role: 'admin' }, Bo: { name: 'Bo', role: 'member', points: 0, streak: 0 } };
  state.tasks = { a: mkTask() };
  document.body.innerHTML = '<div id="toast"></div>';
});
afterEach(() => vi.useRealTimers());

describe('member ticks a needs-check chore', () => {
  it('writes only checkPending: no points, history, streak or done', async () => {
    const { me, adm } = as('Bo', false);
    await toggleTask('a', me, adm);
    expect(patchTask).toHaveBeenCalledTimes(1);
    expect(patchTask.mock.calls[0][1]).toEqual({ checkPending: { by: 'Bo', at: NOW }, checkNote: null });
    expect(adjustMemberPoints).not.toHaveBeenCalled(); expect(appendHistory).not.toHaveBeenCalled(); expect(patchMember).not.toHaveBeenCalled();
    expect(state.tasks.a.done).toBe(false);
  });
  it('can cancel their own pending check, not someone else\'s', async () => {
    state.tasks.a = mkTask({ person: '', checkPending: { by: 'Bo', at: TICK } });
    state.members.Cy = { name: 'Cy', role: 'member' };
    await toggleTask('a', () => 'Cy', () => false);
    expect(patchTask).not.toHaveBeenCalled();
    await toggleTask('a', () => 'Bo', () => false);
    expect(patchTask.mock.calls[0][1]).toEqual({ checkPending: null });
  });
  it('is never overdue while waiting', () => {
    state.tasks.a = mkTask({ checkPending: { by: 'Bo', at: TICK } });
    expect(dueStatus(state.tasks.a, NOW)).toBe('ok');
    expect(dueStatus(mkTask(), NOW)).toBe('overdue');
  });
});

describe('approve / send back', () => {
  beforeEach(() => { state.tasks.a = mkTask({ checkPending: { by: 'Bo', at: TICK } }); });
  it('Looks good awards once to the child with the tick time and checkedBy', async () => {
    const { me, adm } = as('Ann', true);
    await approveCheck('a', adm, me);
    expect(adjustMemberPoints).toHaveBeenCalledTimes(1);
    expect(adjustMemberPoints.mock.calls[0][0]).toBe('Bo');
    expect(adjustMemberPoints.mock.calls[0][1].pts).toBe(taskPoints(mkTask()));
    const task = patchTask.mock.calls.find(c => c[1].done)[1];
    expect(task).toMatchObject({ done: true, lastDone: TICK, lastDoneBy: 'Bo', checkPending: null });
    expect(appendHistory.mock.calls[0][0]).toMatchObject({ person: 'Bo', completedAt: TICK, checkedBy: 'Ann' });
  });
  it('double tap awards once', async () => {
    const { me, adm } = as('Ann', true);
    await Promise.all([approveCheck('a', adm, me), approveCheck('a', adm, me)]);
    await approveCheck('a', adm, me);
    expect(adjustMemberPoints).toHaveBeenCalledTimes(1);
    expect(appendHistory).toHaveBeenCalledTimes(1);
  });
  it('Not yet stores the reason (max 100) and awards nothing', async () => {
    await sendBackCheck('a', ' ' + 'x'.repeat(150), () => true);
    expect(patchTask.mock.calls[0][1].checkNote).toHaveLength(100);
    expect(state.tasks.a.checkPending).toBeNull();
    expect(adjustMemberPoints).not.toHaveBeenCalled(); expect(appendHistory).not.toHaveBeenCalled();
  });
  it('Not yet with no reason stores null', async () => {
    await sendBackCheck('a', '  ', () => true);
    expect(patchTask.mock.calls[0][1].checkNote).toBeNull();
  });
  it('non-admins cannot approve or send back', async () => {
    await approveCheck('a', () => false, () => 'Bo');
    await sendBackCheck('a', 'x', () => false);
    expect(takeCheckPending).not.toHaveBeenCalled();
    expect(state.tasks.a.checkPending).toBeTruthy();
  });
  it('does not move the streak backwards when approved after a newer completion', async () => {
    state.members.Bo.lastStreakDate = '2026-10-27'; state.members.Bo.streak = 5;
    state.tasks.a.checkPending = { by: 'Bo', at: NOW - 3 * 86400000 };
    await approveCheck('a', () => true, () => 'Ann');
    expect(patchMember.mock.calls[0][1]).toMatchObject({ streak: 5, lastStreakDate: '2026-10-27' });
  });
});

describe('admin tick and unflagged chores', () => {
  it('admin ticking a needs-check chore completes it directly', async () => {
    await toggleTask('a', () => 'Ann', () => true);
    expect(adjustMemberPoints).toHaveBeenCalledTimes(1);
    expect(patchTask.mock.calls.find(c => c[1].done)[1]).toMatchObject({ done: true, checkPending: null });
  });
  it('unflagged chores still award straight away for members', async () => {
    state.tasks.a = mkTask({ needsCheck: undefined });
    await toggleTask('a', () => 'Bo', () => false);
    expect(adjustMemberPoints).toHaveBeenCalledTimes(1);
    expect(appendHistory.mock.calls[0][0].checkedBy).toBeUndefined();
  });
});

describe('review fixes: admin tick, failed completion, buttons', () => {
  beforeEach(() => { state.tasks.a = mkTask({ person: '', checkPending: { by: 'Bo', at: TICK } }); });
  it('admin ticking a waiting card approves for the child, not for the admin', async () => {
    await toggleTask('a', () => 'Ann', () => true);
    expect(takeCheckPending).toHaveBeenCalledTimes(1);
    expect(adjustMemberPoints).toHaveBeenCalledTimes(1);
    expect(adjustMemberPoints.mock.calls[0][0]).toBe('Bo');
    expect(patchTask.mock.calls.find(c => c[1].done)[1]).toMatchObject({ lastDoneBy: 'Bo', lastDone: TICK });
    expect(appendHistory.mock.calls[0][0]).toMatchObject({ person: 'Bo', checkedBy: 'Ann' });
  });
  it('a second parent ticking after the request was taken cannot award twice', async () => {
    await Promise.all([toggleTask('a', () => 'Ann', () => true), approveCheck('a', () => true, () => 'Cy')]);
    expect(adjustMemberPoints).toHaveBeenCalledTimes(1);
    expect(appendHistory).toHaveBeenCalledTimes(1);
  });
  it('puts the request back when saving the completion fails', async () => {
    patchTask.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'PERMISSION_DENIED' }));
    await approveCheck('a', () => true, () => 'Ann');
    expect(adjustMemberPoints).not.toHaveBeenCalled();
    const restore = patchTask.mock.calls.find(c => c[1].checkPending);
    expect(restore[1].checkPending).toEqual({ by: 'Bo', at: TICK });
  });
  it('approve and send back do nothing in READONLY (TV) mode', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', async () => ({ ...(await vi.importActual('../src/config.js')), READONLY: true }));
    const mod = await import('../src/tasks.js');
    const { state: st } = await import('../src/state.js');
    const fb = await import('../src/firebase.js');
    st.members = { Bo: { name: 'Bo', role: 'member' } }; st.tasks = { a: mkTask({ checkPending: { by: 'Bo', at: TICK } }) };
    await mod.approveCheck('a', () => true, () => 'Ann');
    await mod.sendBackCheck('a', 'x', () => true);
    expect(fb.takeCheckPending).not.toHaveBeenCalled();
    expect(fb.patchTask).not.toHaveBeenCalled();
    vi.doUnmock('../src/config.js');
  });
  it('shows the escaped buttons to admins only, never to members', () => {
    const w = mkTask({ checkPending: { by: '<b>Bo</b>', at: TICK } });
    initRender(() => true, () => 'Ann');
    const admin = renderCard(w);
    expect(admin).toContain('window.approveCheck'); expect(admin).toContain('window.sendBackCheck');
    expect(admin).toContain('&lt;b&gt;Bo&lt;/b&gt; is waiting'); expect(admin).not.toContain('<b>Bo</b>');
    initRender(() => false, () => 'Bo');
    expect(renderCard(w)).not.toContain('window.approveCheck');
  });
});

describe('flag on add / edit and rendering', () => {
  it('addTask saves needsCheck only when ticked', async () => {
    document.body.insertAdjacentHTML('beforeend', '<input id="new-task" value="Z"><select id="new-freq"><option value="daily"></option></select><select id="new-person"><option value=""></option></select><select id="new-diff"><option>easy</option></select><select id="new-cat"><option value=""></option></select><input id="new-duedate"><div id="new-days"></div><textarea id="new-notes"></textarea><input type="checkbox" id="new-needscheck" checked>');
    await addTask(() => true);
    const t = Object.values(patchPaths.mock.calls[0][0]).find(v => v && v.name === 'Z');
    expect(t.needsCheck).toBe(true);
    expect(document.getElementById('new-needscheck').checked).toBe(false);
  });
  it('saveTask writes needsCheck true / null', async () => {
    const card = on => { document.body.innerHTML = '<div id="tc-a" class="task-card editing"><input class="edit-name" value="Bathroom"><select class="edit-freq"><option value="weekly" selected></option></select><input class="edit-interval"><div class="edit-days"></div><input class="edit-duedate"><input class="edit-duetime"><select class="edit-diff"><option>easy</option></select><select class="edit-cat"><option value=""></option></select><select class="edit-person"><option value="Bo">Bo</option></select><input type="checkbox" class="edit-needscheck"' + (on ? ' checked' : '') + '><textarea class="edit-notes"></textarea></div><div id="toast"></div>'; };
    card(true); await saveTask('a', () => true);
    expect(patchPaths.mock.calls[0][0]['tasks/a/needsCheck']).toBe(true);
    card(false); await saveTask('a', () => true);
    expect(patchPaths.mock.calls[1][0]['tasks/a/needsCheck']).toBeNull();
    expect(patchPaths.mock.calls[1][0]['tasks/a/checkPending']).toBeNull();
  });
  it('card shows the tag, the waiting state and (admin only) the buttons, escaped', () => {
    expect(renderCard(mkTask())).toContain('✓ Parent check');
    const w = mkTask({ checkPending: { by: '<b>Bo</b>', at: TICK } });
    const html = renderCard(w);
    expect(html).toContain('Waiting for parent check');
    expect(html).not.toContain('<b>Bo</b>');
    expect(html).not.toContain('Overdue');
  });
});

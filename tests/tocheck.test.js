// #239: "To check" list, badge, "Not yet" note and daily notification for the parent check.
// Firebase mocked; never touches a live database.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn().mockResolvedValue(undefined), patchMember: vi.fn(), patchRoot: vi.fn(),
  adjustMemberPoints: vi.fn(), appendHistory: vi.fn(), patchPaths: vi.fn(), takeCheckPending: vi.fn(),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchTask } from '../src/firebase.js';
import { state } from '../src/state.js';
import { waitingChecks, toCheckHTML, refreshToCheck, openToCheck, updateToCheckBadge } from '../src/tocheck.js';
import { render, initRender } from '../src/render.js';
import { toggleTask } from '../src/tasks.js';
import { _resetForTests } from '../src/notifications.js';

const NOW = new Date(2026, 9, 14, 12).getTime();
const yes = () => true, no = () => false;
const wait = (id, by, at, o = {}) => ({ id, name: id, freq: 'weekly', difficulty: 'medium', person: by, done: false, lastDone: 0, needsCheck: true, checkPending: { by, at }, ...o });

beforeEach(() => {
  document.body.innerHTML =
    '<button id="btn-tocheck" class="hidden"><span id="tocheck-count"></span></button>' +
    '<div id="tocheck-modal" class="hidden"><div id="tocheck-list"></div></div>' +
    ['h-total', 'h-done', 'h-overdue', 'h-pct'].map(i => '<span id="' + i + '"></span>').join('') +
    '<div id="prog"></div><div id="member-chips"></div><select id="new-person"></select><div id="filters"></div><div id="task-list"></div>';
  state.members = { Al: { name: 'Al', role: 'member' }, Bo: { name: 'Bo', role: 'member' } };
  state.tasks = {
    late: wait('late', 'Bo', NOW - 1000),
    early: wait('early', 'Al', NOW - 5000),
    done: { id: 'done', name: 'done', freq: 'daily', person: 'Al', done: true, lastDone: NOW },
    plain: { id: 'plain', name: 'plain', freq: 'daily', person: 'Al', done: false, lastDone: 0 },
  };
  state.history = [];
});

describe('To check list (#239)', () => {
  it('lists only waiting chores, oldest request first', () => {
    expect(waitingChecks().map(t => t.id)).toEqual(['early', 'late']);
  });
  it('rows show chore, child, points and the two #238 actions', () => {
    const html = toCheckHTML();
    expect(html.indexOf('early')).toBeLessThan(html.indexOf('late'));
    expect(html).toContain('Al'); expect(html).toContain('+6 pts');
    expect(html).toContain("window.approveCheck('early')");
    expect(html).toContain("window.sendBackCheck('early')");
    expect(html).not.toContain('plain');
  });
  it('escapes chore and member names', () => {
    state.tasks.late.name = '<img src=x onerror=alert(1)>';
    state.tasks.late.checkPending.by = '<b>Bo</b>';
    const html = toCheckHTML();
    expect(html).not.toContain('<img'); expect(html).not.toContain('<b>Bo');
  });
  it('says so when nothing is waiting', () => {
    state.tasks = {};
    expect(toCheckHTML()).toContain('Nothing is waiting');
  });
  it('opens the modal for an admin with the list rendered', () => {
    openToCheck(yes);
    expect(document.getElementById('tocheck-modal').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('tocheck-list').innerHTML).toContain('early');
  });
  it('does not open for a member', () => {
    openToCheck(no);
    expect(document.getElementById('tocheck-modal').classList.contains('hidden')).toBe(true);
  });
  it('re-renders live while open and refreshes on snapshot', () => {
    openToCheck(yes);
    delete state.tasks.early;
    refreshToCheck(yes);
    expect(document.getElementById('tocheck-list').innerHTML).not.toContain('early');
  });
});

describe('To check badge (#239)', () => {
  const btn = () => document.getElementById('btn-tocheck');
  it('shows the count for an admin', () => {
    updateToCheckBadge(); refreshToCheck(yes);
    expect(btn().classList.contains('hidden')).toBe(false);
    expect(document.getElementById('tocheck-count').textContent).toBe('2');
    expect(btn().getAttribute('aria-label')).toBe('To check (2)');
  });
  it('is hidden at 0', () => {
    state.tasks = {}; refreshToCheck(yes);
    expect(btn().classList.contains('hidden')).toBe(true);
  });
  it('is hidden for a member', () => {
    refreshToCheck(no);
    expect(btn().classList.contains('hidden')).toBe(true);
  });
  it('render() keeps it in sync', () => {
    initRender(yes, () => 'Ann'); render();
    expect(document.getElementById('tocheck-count').textContent).toBe('2');
  });
  it('is hidden on the read-only TV view', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', async () => ({ ...(await vi.importActual('../src/config.js')), READONLY: true }));
    const tc = await import('../src/tocheck.js');
    const st = (await import('../src/state.js')).state;
    st.tasks = { a: wait('a', 'Al', NOW) }; st.members = { Al: { name: 'Al' } };
    tc.refreshToCheck(yes);
    expect(document.getElementById('btn-tocheck').classList.contains('hidden')).toBe(true);
    tc.openToCheck(yes);
    expect(document.getElementById('tocheck-modal').classList.contains('hidden')).toBe(true);
    vi.doUnmock('../src/config.js');
  });
});

describe('"Not yet" reason on the child card (#239)', () => {
  const card = () => document.getElementById('task-list').innerHTML;
  beforeEach(() => { initRender(no, () => 'Al'); });
  it('shows "Not yet: <reason>" after being sent back, escaped', () => {
    state.tasks = { s: { id: 's', name: 'Sent', freq: 'weekly', person: 'Al', done: false, lastDone: 0, needsCheck: true, checkNote: 'Do <i>corners</i>' } };
    render();
    expect(card()).toContain('Not yet: Do &lt;i&gt;corners&lt;/i&gt;');
  });
  it('is not shown while waiting for a check or when done', () => {
    state.tasks = { s: wait('s', 'Al', NOW, { checkNote: 'old' }), d: { id: 'd', name: 'D', freq: 'daily', person: 'Al', done: true, lastDone: NOW, checkNote: 'old' } };
    render();
    expect(card()).not.toContain('Not yet:');
  });
  it('is cleared when the child ticks again', async () => {
    state.tasks = { s: { id: 's', name: 'Sent', freq: 'weekly', person: 'Al', done: false, lastDone: 0, needsCheck: true, checkNote: 'again' } };
    await toggleTask('s', () => 'Al', no);
    expect(patchTask).toHaveBeenCalledWith('s', expect.objectContaining({ checkNote: null, checkPending: expect.objectContaining({ by: 'Al' }) }));
  });
});

describe('daily "N chores to check" notification (#239)', () => {
  let N;
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(NOW);
    _resetForTests(); localStorage.clear();
    N = vi.fn(); N.permission = 'granted'; N.requestPermission = vi.fn();
    vi.stubGlobal('Notification', N); window.Notification = N;
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  const bodies = () => N.mock.calls.map(c => c[1].body);

  it('notifies an admin once per day, however many snapshots arrive', async () => {
    refreshToCheck(yes); refreshToCheck(yes);
    await vi.advanceTimersByTimeAsync(0);
    refreshToCheck(yes);
    await vi.advanceTimersByTimeAsync(0);
    expect(bodies()).toEqual(['2 chores to check']);
  });
  it('notifies again the next day', async () => {
    refreshToCheck(yes); await vi.advanceTimersByTimeAsync(0);
    vi.setSystemTime(NOW + 86400000);
    refreshToCheck(yes); await vi.advanceTimersByTimeAsync(0);
    expect(N).toHaveBeenCalledTimes(2);
  });
  it('says "1 chore to check" for one', async () => {
    delete state.tasks.late; refreshToCheck(yes); await vi.advanceTimersByTimeAsync(0);
    expect(bodies()).toEqual(['1 chore to check']);
  });
  it('stays silent for members, with nothing waiting, or without permission', async () => {
    refreshToCheck(no);
    state.tasks = {}; refreshToCheck(yes);
    N.permission = 'denied'; state.tasks = { a: wait('a', 'Al', NOW) }; refreshToCheck(yes);
    await vi.advanceTimersByTimeAsync(0);
    expect(N).not.toHaveBeenCalled();
  });
});

describe('modal markup (#239)', () => {
  const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
  const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
  it('follows the modal pattern: dialog, starts hidden, css pair, no inline display', () => {
    expect(html).toMatch(/<div id="tocheck-modal" class="hidden" role="dialog" aria-modal="true"/);
    expect(html).not.toMatch(/id="tocheck-modal"[^>]*style=/);
    expect(css).toContain('#tocheck-modal.hidden');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { isMine, dueStatus } from '../src/utils.js';
import {
  selectNotifyTasks, runOverdueCheck, enableNotifications, initNotifications, syncNotifyButton, _resetForTests,
} from '../src/notifications.js';

const NOW = new Date(2026, 9, 14, 12).getTime();
const DAY = 86400000;
const t = (id, o) => ({ id, name: id, freq: 'daily', done: false, lastDone: NOW - 3 * DAY, person: '', ...o });

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  _resetForTests();
  localStorage.clear();
  document.body.innerHTML = '<button id="btn-notify" class="hidden"></button>';
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('isMine (Mine filter)', () => {
  it('includes my due chores and unclaimed due chores', () => {
    expect(isMine(t('a', { person: 'Ann' }), 'Ann')).toBe(true);
    expect(isMine(t('b', {}), 'Ann')).toBe(true);
  });
  it("excludes other people's chores and future (on-track) chores", () => {
    expect(isMine(t('c', { person: 'Bob' }), 'Ann')).toBe(false);
    expect(isMine(t('d', { person: 'Ann', freq: 'weekly', lastDone: NOW }), 'Ann')).toBe(false);
    expect(dueStatus(t('d', { person: 'Ann', freq: 'weekly', lastDone: NOW }))).toBe('ok');
  });
  it('shows my completed chores, not other people\'s', () => {
    expect(isMine(t('e', { person: 'Ann', done: true }), 'Ann')).toBe(true);
    expect(isMine(t('f', { person: 'Bob', done: true }), 'Ann')).toBe(false);
  });
  it('is empty when nobody is logged in', () => {
    expect(isMine(t('g', {}), '')).toBe(false);
  });
});

describe('selectNotifyTasks', () => {
  const tasks = {
    a: t('a', { person: 'Ann' }), b: t('b', { person: 'Bob' }), c: t('c', {}),
    d: t('d', { person: 'Ann', done: true }), e: t('e', { person: 'Ann', freq: 'weekly', lastDone: NOW }),
  };
  it("returns only the current member's overdue, not-done chores", () => {
    expect(selectNotifyTasks(tasks, 'Ann').map(x => x.id)).toEqual(['a']);
    expect(selectNotifyTasks(tasks, 'Bob').map(x => x.id)).toEqual(['b']);
  });
  it('returns nothing without a member', () => {
    expect(selectNotifyTasks(tasks, '')).toEqual([]);
  });
});

describe('runOverdueCheck', () => {
  function stubNotification(permission) {
    const ctor = vi.fn();
    ctor.permission = permission;
    ctor.requestPermission = vi.fn().mockResolvedValue('granted');
    vi.stubGlobal('Notification', ctor);
    window.Notification = ctor;
    return ctor;
  }
  beforeEach(() => {
    state.tasks = { a: t('a', { person: 'Ann' }), b: t('b', { person: 'Bob' }), c: t('c', {}) };
  });
  it("notifies only for the current member's chores, once", () => {
    const N = stubNotification('granted');
    initNotifications(() => 'Ann');
    runOverdueCheck();
    expect(N).toHaveBeenCalledTimes(1);
    expect(N.mock.calls[0][1].body).toContain('a is overdue');
  });
  it('sends nothing when permission is not granted or nobody is logged in', () => {
    let N = stubNotification('default');
    initNotifications(() => 'Ann'); runOverdueCheck();
    expect(N).not.toHaveBeenCalled();
    N = stubNotification('granted');
    initNotifications(() => ''); runOverdueCheck();
    expect(N).not.toHaveBeenCalled();
  });
});

describe('permission is requested only from the button', () => {
  it('initNotifications never prompts', () => {
    const ctor = vi.fn(); ctor.permission = 'default'; ctor.requestPermission = vi.fn();
    window.Notification = ctor;
    initNotifications(() => 'Ann');
    expect(ctor.requestPermission).not.toHaveBeenCalled();
    expect(document.getElementById('btn-notify').classList.contains('hidden')).toBe(false);
  });
  it('enableNotifications prompts, then hides the button', async () => {
    const ctor = vi.fn(); ctor.permission = 'default';
    ctor.requestPermission = vi.fn().mockImplementation(async () => { ctor.permission = 'granted'; return 'granted'; });
    window.Notification = ctor;
    initNotifications(() => 'Ann');
    expect(await enableNotifications()).toBe('granted');
    expect(ctor.requestPermission).toHaveBeenCalledTimes(1);
    expect(document.getElementById('btn-notify').classList.contains('hidden')).toBe(true);
  });
  it('button stays hidden when nobody is logged in or already denied', () => {
    const ctor = vi.fn(); ctor.permission = 'denied'; window.Notification = ctor;
    initNotifications(() => 'Ann'); syncNotifyButton();
    expect(document.getElementById('btn-notify').classList.contains('hidden')).toBe(true);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let H, state;
const NOW = new Date(2026, 10, 4, 12, 0, 0); // Wed 4 Nov 2026 local; this week starts Mon 2 Nov
const T = (y, m, d, h = 12, mi = 0, s = 0, ms = 0) => new Date(y, m, d, h, mi, s, ms).getTime();
const mk = (n, over = {}) => ({ taskId: 't' + n, taskName: 'Task ' + n, person: 'Alice', completedAt: T(2026, 10, 3), points: 2, ...over });
const list = () => document.getElementById('history-list').innerHTML;
const rows = () => (list().match(/hist-row/g) || []).length;
const pick = (id, v) => { const el = document.getElementById(id); el.value = v; H.historyOptChange(el); };

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.resetModules();
  state = (await import('../src/state.js')).state;
  H = await import('../src/history.js');
  state.members = { Alice: { name: 'Alice', role: 'admin' }, Bob: { name: 'Bob', role: 'member' } };
  state.history = [];
  state.redemptions = {};
  document.body.innerHTML = '<div id="history-modal" class="hidden"><div id="history-filters"></div>' +
    '<select id="history-chore"></select><select id="history-period"><option value="all"></option><option value="this"></option><option value="last"></option></select>' +
    '<div id="history-list"></div></div>';
});
afterEach(() => vi.useRealTimers());

describe('chore filter', () => {
  it('lists distinct chore names present in history, sorted, without bonus rows', () => {
    state.history = [mk(1, { taskName: 'Bins' }), mk(2, { taskName: 'Bins' }), mk(3, { taskName: 'Alpha' }), mk(4, { type: 'bonus', reason: 'Nice', taskName: 'Zed' })];
    H.openHistory();
    const opts = [...document.querySelectorAll('#history-chore option')].map(o => o.value);
    expect(opts).toEqual(['', 'Alpha', 'Bins']);
  });
  it('filters to one chore', () => {
    state.history = [mk(1, { taskName: 'Bins' }), mk(2, { taskName: 'Dishes' })];
    H.openHistory();
    pick('history-chore', 'Bins');
    expect(list()).toContain('Bins');
    expect(list()).not.toContain('Dishes');
  });
  it('escapes chore names in options and rows', () => {
    state.history = [mk(1, { taskName: '<img src=x onerror=alert(1)>' })];
    H.openHistory();
    const sel = document.getElementById('history-chore');
    expect(sel.querySelector('img')).toBeNull();
    expect(sel.options).toHaveLength(2);
    expect(sel.options[1].textContent).toBe('<img src=x onerror=alert(1)>');
    pick('history-chore', '<img src=x onerror=alert(1)>');
    expect(list()).not.toContain('<img');
    expect(list()).toContain('&lt;img');
  });
  it('combines with the member filter (AND)', () => {
    state.history = [mk(1, { taskName: 'Bins', person: 'Alice' }), mk(2, { taskName: 'Bins', person: 'Bob' }), mk(3, { taskName: 'Dishes', person: 'Bob' })];
    H.openHistory();
    pick('history-chore', 'Bins');
    H.setHistoryFilter('Bob');
    expect(rows()).toBe(1);
    expect(list()).not.toContain('Dishes');
  });
});

describe('period filter', () => {
  const hist = () => [
    mk(1, { taskName: 'SunBefore', completedAt: T(2026, 9, 25, 23, 59, 59, 999) }), // Sun 25 Oct, before last week
    mk(2, { taskName: 'LastMonStart', completedAt: T(2026, 9, 26, 0, 0, 0, 0) }),   // Mon 26 Oct 00:00, first moment of last week
    mk(3, { taskName: 'LastSunEnd', completedAt: T(2026, 10, 1, 23, 59, 59, 999) }), // Sun 1 Nov 23:59:59.999, last moment of last week
    mk(4, { taskName: 'ThisMonStart', completedAt: T(2026, 10, 2, 0, 0, 0, 0) }),    // Mon 2 Nov 00:00, this week
    mk(5, { taskName: 'ThisWed', completedAt: T(2026, 10, 4, 9) })
  ];
  it('Last week spans Mon 00:00 to Sun 23:59:59.999, across the Monday midnight', () => {
    state.history = hist();
    H.openHistory();
    pick('history-period', 'last');
    expect(list()).toContain('LastMonStart');
    expect(list()).toContain('LastSunEnd');
    expect(list()).not.toContain('SunBefore');
    expect(list()).not.toContain('ThisMonStart');
    expect(list()).not.toContain('ThisWed');
  });
  it('This week starts at Monday 00:00', () => {
    state.history = hist();
    H.openHistory();
    pick('history-period', 'this');
    expect(list()).toContain('ThisMonStart');
    expect(list()).toContain('ThisWed');
    expect(list()).not.toContain('LastSunEnd');
  });
  it('All shows everything', () => {
    state.history = hist();
    H.openHistory();
    pick('history-period', 'last');
    pick('history-period', 'all');
    expect(rows()).toBe(5);
  });
  it('week boundaries roll over at Monday midnight', () => {
    expect(H.periodRange('this', T(2026, 10, 8, 23, 59))[0]).toBe(T(2026, 10, 2, 0)); // Sun still this week
    expect(H.periodRange('last', T(2026, 10, 9, 0, 1))[0]).toBe(T(2026, 10, 2, 0)); // Monday after: last week = 2-8 Nov
  });
  it('combines with chore and member (AND)', () => {
    state.history = [...hist(), mk(6, { taskName: 'LastSunEnd', person: 'Bob', completedAt: T(2026, 10, 1, 10) })];
    H.openHistory();
    pick('history-period', 'last');
    pick('history-chore', 'LastSunEnd');
    H.setHistoryFilter('Bob');
    expect(rows()).toBe(1);
    expect(list()).toContain('Bob');
  });
});

describe('empty state, reset, display only', () => {
  it('shows "Nothing here yet" when filters match nothing', () => {
    state.history = [mk(1)];
    H.openHistory();
    pick('history-period', 'last');
    expect(list()).toContain('Nothing here yet');
  });
  it('keeps the plain empty line with no filters', () => {
    H.openHistory();
    expect(list()).toContain('No completions yet');
  });
  it('filters reset when the modal is reopened (after close or another member logs in)', () => {
    state.history = [mk(1, { taskName: 'Bins' }), mk(2, { taskName: 'Dishes', person: 'Bob' })];
    H.openHistory();
    pick('history-chore', 'Bins');
    pick('history-period', 'this');
    H.setHistoryFilter('Alice');
    H.openHistory();
    expect(document.getElementById('history-chore').value).toBe('');
    expect(document.getElementById('history-period').value).toBe('all');
    expect(list()).toContain('Dishes');
    expect(document.querySelector('#history-filters .active').textContent).toBe('Everyone');
  });
  it('works read-only (TV): no firebase or write code, no controls in the list', () => {
    state.history = [mk(1)];
    H.openHistory();
    expect(document.querySelectorAll('#history-list button, #history-list input').length).toBe(0);
    expect(readFileSync(resolve(__dirname, '../src/history.js'), 'utf8')).not.toMatch(/firebase|patch|writeState/);
  });
  it('markup: labelled selects wired to the handler', () => {
    const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
    expect(html).toMatch(/<label for="history-chore">/);
    expect(html).toMatch(/<label for="history-period">/);
    expect(html).toContain('window.historyOptChange(this)');
    expect(html).toContain('Last week');
  });
});

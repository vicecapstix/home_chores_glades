import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let H, state;
const mk = (n, over = {}) => ({ taskId: 't' + n, taskName: 'Task ' + n, person: 'Alice', completedAt: 1000 + n, points: 2, ...over });

beforeEach(async () => {
  vi.resetModules();
  state = (await import('../src/state.js')).state;
  H = await import('../src/history.js');
  state.members = { Alice: { name: 'Alice', role: 'admin' }, Bob: { name: 'Bob', role: 'member' } };
  state.history = [];
  document.body.innerHTML = '<div id="history-modal" class="hidden"><div id="history-filters"></div><div id="history-list"></div></div>';
});

describe('recentCompletions', () => {
  it('returns newest first and caps at 50', () => {
    const hist = Array.from({ length: 80 }, (_, i) => mk(i));
    const r = H.recentCompletions(hist);
    expect(r).toHaveLength(50);
    expect(r[0].completedAt).toBe(1079);
    expect(r[49].completedAt).toBe(1030);
  });
  it('filters by member before capping', () => {
    const hist = [...Array.from({ length: 60 }, (_, i) => mk(i)), mk(100, { person: 'Bob' })];
    const r = H.recentCompletions(hist, 'Bob');
    expect(r).toHaveLength(1);
    expect(r[0].person).toBe('Bob');
  });
  it('tolerates missing history and does not mutate input', () => {
    expect(H.recentCompletions(undefined)).toEqual([]);
    const hist = [mk(1), mk(2)];
    H.recentCompletions(hist);
    expect(hist[0].completedAt).toBe(1001);
  });
});

describe('history modal rendering', () => {
  it('renders who, what and points; unassigned shows Anyone', () => {
    state.history = [mk(1), mk(2, { person: '' })];
    H.openHistory();
    const html = document.getElementById('history-list').innerHTML;
    expect(html).toContain('Task 1');
    expect(html).toContain('+2');
    expect(html).toContain('Anyone');
  });
  it('escapes task and member names (XSS)', () => {
    state.history = [mk(1, { taskName: '<img src=x onerror=alert(1)>', person: '<b>x</b>' })];
    H.openHistory();
    const html = document.getElementById('history-list').innerHTML;
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>x');
    expect(html).toContain('&lt;img');
  });
  it('shows an empty state', () => {
    H.openHistory();
    expect(document.getElementById('history-list').textContent).toContain('No completions yet');
  });
  it('opens the modal (removes .hidden) and offers a pill per member', () => {
    H.openHistory();
    expect(document.getElementById('history-modal').classList.contains('hidden')).toBe(false);
    const pills = [...document.querySelectorAll('#history-filters button')].map(b => b.textContent);
    expect(pills).toEqual(['Everyone', 'Alice', 'Bob']);
  });
  it('setHistoryFilter limits the list to one member', () => {
    state.history = [mk(1), mk(2, { person: 'Bob', taskName: 'Bob job' })];
    H.openHistory();
    H.setHistoryFilter('Bob');
    const html = document.getElementById('history-list').innerHTML;
    expect(html).toContain('Bob job');
    expect(html).not.toContain('Task 1');
  });
  it('has no write controls and does not touch Firebase', () => {
    state.history = [mk(1)];
    H.openHistory();
    expect(document.querySelectorAll('#history-list button, #history-list input').length).toBe(0);
    expect(readFileSync(resolve(__dirname, '../src/history.js'), 'utf8')).not.toMatch(/firebase|patch|writeState/);
  });
});

describe('markup', () => {
  const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
  const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
  it('follows the modal pattern: starts hidden, CSS pair, header button', () => {
    expect(html).toMatch(/<div id="history-modal" class="hidden"/);
    expect(css).toMatch(/#history-modal\.hidden/);
    expect(html).toContain('window.openHistory()');
  });
});

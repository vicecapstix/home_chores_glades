import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { initRender, render } from '../src/render.js';

const NOW = new Date(2026, 9, 14, 12).getTime();
const DOM = '<button id="btn-select">Select</button><div id="filters"></div><div id="task-list"></div>' +
  '<div id="bulk-bar"><span id="bulk-count"></span></div><select id="new-person"></select><div id="member-chips"></div>' +
  '<i id="h-total"></i><i id="h-done"></i><i id="h-overdue"></i><i id="h-pct"></i><div id="prog"></div>';

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  initRender(() => true, () => 'Al');
  state.members = { Al: { name: 'Al', role: 'admin' } };
  state.tasks = {
    a: { id: 'a', name: 'Bins', freq: 'weekly', done: false, lastDone: 0, person: 'Al', difficulty: 'medium', order: 1 },
    o: { id: 'o', name: 'Pool', freq: 'weekly', done: false, lastDone: 0, person: 'Al', difficulty: 'easy', order: 2, offUntil: '2026-12-01' },
    s: { id: 's', name: 'Once', freq: 'once', done: true, lastDone: new Date(2026, 9, 10, 9).getTime(), person: 'Al', difficulty: 'easy', order: 3 },
  };
  document.body.innerHTML = DOM;
});
afterEach(() => { vi.useRealTimers(); });

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../src/style.css'), 'utf8');
const block = min => {
  const head = '@media (min-width: ' + min + 'px) {';
  for (let i = css.indexOf(head); i > -1; i = css.indexOf(head, i + 1)) {
    const b = css.slice(i, css.indexOf('\n}\n', i));
    if (b.includes('body.tv #task-list')) return b;
  }
  throw new Error('no TV block at ' + min);
};

it('Off and folded Done sections carry the data-k the TV grid targets (#392)', () => {
  render();
  expect(document.querySelector('details.off-chores').getAttribute('data-k')).toBe('off');
  expect(document.querySelector('details.done-once').getAttribute('data-k')).toBe('stale');
});

it.each(['900', '1200'])('style.css places off/stale full width below the ok row at >=%spx (#392)', min => {
  const b = block(min);
  const row = {};
  for (const k of ['off', 'stale']) {
    const m = b.match(new RegExp('body\\.tv \\.section\\[data-k="' + k + '"\\]\\s*\\{([^}]*)\\}'));
    expect(m, k + ' rule at ' + min).toBeTruthy();
    expect(m[1]).toContain('grid-column: 1 / -1');
    row[k] = +m[1].match(/grid-row:\s*(\d+)/)[1];
  }
  const okRow = min === '900' ? 4 : 3;
  expect(row.off).toBeGreaterThan(okRow);
  expect(row.stale).toBeGreaterThan(row.off);
});

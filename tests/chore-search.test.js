import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { initRender, renderTasks, setFilter, setCatFilter, setSearch, clearSearch, matchesSearch, syncViewToMember } from '../src/render.js';

const DAY = 86400000;
const task = (id, o = {}) => ({ id, name: id, freq: 'daily', done: false, lastDone: Date.now() - 3 * DAY, person: '', difficulty: 'easy', order: 1, category: '', ...o });
const names = () => [...document.querySelectorAll('#task-list .task-card')].map(c => c.id.replace('tc-', '')).sort();
const DOM = '<input id="chore-search-input"><button id="chore-search-clear" class="hidden"></button><div id="filters"></div><div id="task-list"></div>';

beforeEach(() => {
  initRender(() => true, () => 'Kid');
  state.members = { Kid: { name: 'Kid', role: 'member' }, Al: { name: 'Al', role: 'admin' } };
  state.tasks = {
    a: task('a', { name: 'Wash dishes', category: 'Kitchen', person: 'Kid' }),
    b: task('b', { name: 'Wipe bench', category: 'Kitchen', person: 'Al' }),
    c: task('c', { name: 'Water plants', notes: 'Use the DISH tub', category: 'Garden', person: 'Kid' }),
    d: task('d', { name: 'Bins', person: 'Al', done: true }),
  };
  document.body.innerHTML = DOM;
  setFilter('all');
  setSearch('');
});

describe('chore search (#354)', () => {
  it('matches name or notes, case-insensitively, as you type', () => {
    setSearch('DISH');
    expect(names()).toEqual(['a', 'c']);
    setSearch('wi');
    expect(names()).toEqual(['b']);
    setSearch('  plants ');
    expect(names()).toEqual(['c']);
  });
  it('matchesSearch: empty query matches everything', () => {
    expect(matchesSearch({ name: 'x' }, '')).toBe(true);
    expect(matchesSearch({ name: 'x' }, '   ')).toBe(true);
    expect(matchesSearch({ name: 'x' }, 'y')).toBe(false);
    expect(matchesSearch({}, 'y')).toBe(false);
  });
  it('combines with Mine, category and status filters', () => {
    setSearch('w');                       // a, b, c all contain "w"
    setFilter('mine');
    expect(names()).toEqual(['a', 'c']);
    setCatFilter('Kitchen');
    expect(names()).toEqual(['a']);
    setCatFilter('Kitchen'); setFilter('done');
    setSearch('bins');
    expect(names()).toEqual(['d']);
    setSearch('wash');
    expect(names()).toEqual([]);
  });
  it('shows "No chores match" when nothing matches, and the normal text otherwise', () => {
    setSearch('zzz');
    expect(document.querySelector('#task-list .empty').textContent).toBe('No chores match');
    setFilter('done'); setSearch('');
    expect(document.querySelector('#task-list .task-card')).not.toBeNull();
  });
  it('clear button shows only with text; clearSearch empties the box and restores the list', () => {
    const x = document.getElementById('chore-search-clear');
    setSearch('dish');
    expect(x.classList.contains('hidden')).toBe(false);
    clearSearch();
    expect(document.getElementById('chore-search-input').value).toBe('');
    expect(x.classList.contains('hidden')).toBe(true);
    expect(names()).toEqual(['a', 'b', 'c', 'd']);
  });
  it('Esc in the input is wired to clearSearch and the input has a label', () => {
    const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
    expect(html).toMatch(/id="chore-search-input"[^>]*onkeydown="if\(event\.key==='Escape'\)window\.clearSearch\(\)"/);
    expect(html).toMatch(/<label for="chore-search-input" class="sr-only">Search chores<\/label>/);
    expect(html).toMatch(/id="chore-search-clear"[^>]*aria-label="Clear search"/);
  });
  it('the search row is hidden on the readonly TV by CSS', () => {
    const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
    expect(css).toMatch(/body\[data-readonly\] #chore-search[^{]*\{\s*display:\s*none\s*!important/);
  });
  it('a different member taking over the device starts with an empty search', () => {
    syncViewToMember();
    setSearch('dish');
    initRender(() => true, () => 'Al');
    syncViewToMember();
    expect(document.getElementById('chore-search-input').value).toBe('');
    renderTasks();
    expect(names()).toEqual(['a', 'b', 'c', 'd']);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { initRender, renderTasks, setFilter, setCatFilter } from '../src/render.js';

const DAY = 86400000;
const task = (id, o = {}) => ({ id, name: id, freq: 'daily', done: false, lastDone: Date.now() - 3 * DAY, person: '', difficulty: 'easy', order: 1, category: '', ...o });

const names = () => [...document.querySelectorAll('#task-list .task-card')].map(c => c.id.replace('tc-', '')).sort();
const pill = label => [...document.querySelectorAll('#filters .filter-pill')].find(b => b.textContent.startsWith(label));
const count = label => pill(label).querySelector('.count').textContent;

beforeEach(() => {
  initRender(() => true, () => 'Kid');
  state.members = { Kid: { name: 'Kid', role: 'member' }, Al: { name: 'Al', role: 'admin' } };
  state.tasks = {
    k1: task('k1', { category: 'Kitchen', person: 'Kid' }),                       // mine, overdue, kitchen
    k2: task('k2', { category: 'Kitchen', person: 'Al' }),                        // other, overdue, kitchen
    k3: task('k3', { category: 'Kitchen', person: 'Kid', freq: 'weekly', lastDone: Date.now() }), // mine, on-track
    g1: task('g1', { category: 'Garden', person: 'Kid' }),                        // mine, overdue, garden
    n1: task('n1', { person: 'Al', done: true }),
  };
  document.body.innerHTML = '<div id="filters"></div><div id="task-list"></div>';
  setFilter('all');
  if (pill('Kitchen')?.classList.contains('active')) setCatFilter('Kitchen');
  if (pill('Garden')?.classList.contains('active')) setCatFilter('Garden');
  renderTasks();
});

describe('status + category filters combine (#172)', () => {
  it('Mine + Kitchen shows only my kitchen chores and keeps Mine active', () => {
    setFilter('mine'); setCatFilter('Kitchen');
    expect(names()).toEqual(['k1']);
    expect(pill('Mine').classList.contains('active')).toBe(true);
    expect(pill('Kitchen').classList.contains('active')).toBe(true);
  });
  it('Overdue + Kitchen, in either order', () => {
    setCatFilter('Kitchen'); setFilter('overdue');
    expect(names()).toEqual(['k1', 'k2']);
    expect(pill('Overdue').classList.contains('active')).toBe(true);
  });
  it('tapping the active category clears only the category', () => {
    setFilter('mine'); setCatFilter('Kitchen'); setCatFilter('Kitchen');
    expect(pill('Mine').classList.contains('active')).toBe(true);
    expect(pill('Kitchen').classList.contains('active')).toBe(false);
    expect(names()).toEqual(['g1', 'k1']);
  });
  it('changing the status keeps the category; All shows the whole category', () => {
    setFilter('mine'); setCatFilter('Kitchen'); setFilter('all');
    expect(pill('Kitchen').classList.contains('active')).toBe(true);
    expect(names()).toEqual(['k1', 'k2', 'k3']);
  });
  it('pill counts reflect the other active filter', () => {
    setCatFilter('Kitchen');
    expect(count('All')).toBe('3');
    expect(count('Overdue')).toBe('2');
    expect(count('Mine')).toBe('1');
    setFilter('overdue');
    expect(count('Kitchen')).toBe('2');
    expect(count('Garden')).toBe('1');
  });
});

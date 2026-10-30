import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { initRender, render } from '../src/render.js';

const NOW = new Date(2026, 9, 14, 12).getTime();
const DOM = '<button id="btn-select">Select</button><div id="filters"></div><div id="task-list"></div>' +
  '<div id="bulk-bar"><span id="bulk-count"></span></div><select id="new-person"></select><div id="member-chips"></div>' +
  '<i id="h-total"></i><i id="h-done"></i><i id="h-overdue"></i><i id="h-pct"></i><div id="prog"></div>' +
  '<div id="double-banner" class="double-banner hidden" role="status"></div>';

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  initRender(() => true, () => 'Al');
  state.members = { Al: { name: 'Al', role: 'admin' } };
  state.tasks = { a: { id: 'a', name: 'Bins', freq: 'weekly', done: false, lastDone: 0, person: 'Al', difficulty: 'medium', order: 1 } };
  document.body.innerHTML = DOM;
});
afterEach(() => { vi.useRealTimers(); state.doublePoints = null; });

const banner = () => document.getElementById('double-banner');

it('render() shows the double-points banner on the event day and the multiplied points on cards (#225)', () => {
  state.doublePoints = { date: '2026-10-14', mult: 2 };
  render();
  expect(banner().classList.contains('hidden')).toBe(false);
  expect(banner().textContent).toContain('×2');
  expect(document.getElementById('task-list').innerHTML).toContain('+12 pts');
});

it('render() hides the banner on any other day', () => {
  state.doublePoints = { date: '2026-10-15', mult: 3 };
  render();
  expect(banner().classList.contains('hidden')).toBe(true);
  expect(document.getElementById('task-list').innerHTML).toContain('+6 pts');
});

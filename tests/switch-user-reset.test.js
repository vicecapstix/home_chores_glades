import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { initRender, render, setFilter, toggleSelectMode, toggleSelect, getSelectMode, getSelectedIds, syncViewToMember } from '../src/render.js';

let me = 'Al';
const task = (id, o = {}) => ({ id, name: id, freq: 'daily', done: false, lastDone: 0, person: '', difficulty: 'easy', order: 1, ...o });

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  me = 'Al';
  initRender(() => me === 'Al', () => me);
  state.members = { Al: { name: 'Al', role: 'admin' }, Kid: { name: 'Kid', role: 'member' } };
  state.tasks = { a: task('a', { person: 'Al' }), b: task('b', { person: 'Kid' }) };
  document.body.innerHTML = '<button id="btn-select">Select</button><div id="filters"></div><div id="task-list"></div>' +
    '<div id="bulk-bar" class="visible"><span id="bulk-count"></span></div><select id="new-person"></select><div id="member-chips"></div>'+
    '<i id="h-total"></i><i id="h-done"></i><i id="h-overdue"></i><i id="h-pct"></i><div id="prog"></div>';
});

const activePill = () => document.querySelector('#filters .filter-pill.active').textContent;

describe('switching user resets the view (#169)', () => {
  it('admin in select mode on Pending -> kid gets select off, bulk bar hidden, Mine default', () => {
    syncViewToMember(); render();
    setFilter('pending');
    toggleSelectMode(); toggleSelect('a');
    expect(document.getElementById('bulk-bar').classList.contains('visible')).toBe(true);
    me = 'Kid';
    syncViewToMember(); render();
    expect(getSelectMode()).toBe(false);
    expect(getSelectedIds().size).toBe(0);
    expect(document.getElementById('bulk-bar').classList.contains('visible')).toBe(false);
    expect(document.getElementById('task-list').classList.contains('select-mode')).toBe(false);
    expect(document.getElementById('btn-select').textContent).toBe('Select');
    expect(activePill()).toMatch(/^Mine/);
  });
  it('the same member re-entering keeps their state', () => {
    syncViewToMember(); render();
    setFilter('pending'); toggleSelectMode(); toggleSelect('a');
    syncViewToMember(); render();
    expect(getSelectMode()).toBe(true);
    expect(getSelectedIds().has('a')).toBe(true);
    expect(activePill()).toMatch(/^Pending/);
  });
});

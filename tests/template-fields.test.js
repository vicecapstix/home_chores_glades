import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { localDateStr } from '../src/utils.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined),
  patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn().mockResolvedValue(undefined),
}));
import { patchPaths } from '../src/firebase.js';
import * as ui from '../src/ui.js';

beforeEach(() => {
  vi.clearAllMocks();
  state.templates = {}; state.nextId = 1;
  state.tasks = {
    t1: { id: 't1', name: 'Dishes', freq: 'daily', difficulty: 'medium', category: 'Kitchen', notes: 'Use the blue sponge', dueTime: '19:00',
      person: 'Alice', done: true, lastDone: 123, lastDoneBy: 'Alice', lastDonePoints: 2,
      subtasks: { s1: { id: 's1', name: 'Plates', done: true }, s2: { id: 's2', name: 'Cups', done: false } } },
    t2: { id: 't2', name: 'Pack bag', freq: 'once', dueDate: '2026-01-01', difficulty: 'easy' },
  };
  document.body.innerHTML = '<input id="tpl-name-input" value="Set"><div id="tpl-list"></div><div id="templates-modal" class="hidden"></div><div id="toast"></div>';
});

describe('template round trip (#139)', () => {
  it('saves category, notes, dueTime and subtask names only', () => {
    ui.saveTemplate();
    const tpl = Object.values(state.templates)[0];
    const d = tpl.tasks[0];
    expect(d).toMatchObject({ name: 'Dishes', category: 'Kitchen', notes: 'Use the blue sponge', dueTime: '19:00', subtasks: ['Plates', 'Cups'] });
    expect(JSON.stringify(tpl)).not.toMatch(/Alice|lastDone|"done"|oints/);
    expect(tpl.tasks[1].category).toBeUndefined();
    expect(tpl.tasks[1].subtasks).toBeUndefined();
  });
  it('apply restores the fields, with undone subtasks and fresh ids', () => {
    ui.saveTemplate();
    state.tasks = {};
    ui.applyTemplate(Object.keys(state.templates)[0]);
    const [dishes] = Object.values(state.tasks).filter(t => t.name === 'Dishes');
    expect(dishes).toMatchObject({ category: 'Kitchen', notes: 'Use the blue sponge', dueTime: '19:00', person: '', done: false });
    const subs = Object.values(dishes.subtasks);
    expect(subs.map(s => s.name)).toEqual(['Plates', 'Cups']);
    expect(subs.every(s => s.done === false && s.id && dishes.subtasks[s.id])).toBe(true);
    expect(subs.map(s => s.id)).not.toContain('s1');
    expect(new Set(subs.map(s => s.id)).size).toBe(2);
  });
  it('one-off chores come back due today', () => {
    ui.saveTemplate();
    state.tasks = {};
    ui.applyTemplate(Object.keys(state.templates)[0]);
    const once = Object.values(state.tasks).find(t => t.freq === 'once');
    expect(once.dueDate).toBe(localDateStr());
    expect(Object.values(state.tasks).find(t => t.name === 'Dishes').dueDate).toBe('');
  });
  it('a legacy template without the new fields still applies', () => {
    state.templates = { tplOld: { id: 'tplOld', name: 'Old', tasks: [{ name: 'Sweep', freq: 'weekly', difficulty: 'hard' }] } };
    state.tasks = {};
    ui.applyTemplate('tplOld');
    const t = Object.values(state.tasks)[0];
    expect(t).toMatchObject({ name: 'Sweep', freq: 'weekly', difficulty: 'hard', category: '', notes: '', subtasks: {} });
    expect(t.dueTime).toBeUndefined();
    expect(patchPaths).toHaveBeenCalled();
  });
  it('ignores an unknown category and invalid dueTime from a stored template', () => {
    state.templates = { tplX: { id: 'tplX', name: 'X', tasks: [{ name: 'A', freq: 'daily', category: '<img>', dueTime: '99:99' }] } };
    state.tasks = {};
    ui.applyTemplate('tplX');
    const t = Object.values(state.tasks)[0];
    expect(t.category).toBe('');
    expect(t.dueTime).toBeUndefined();
  });
});

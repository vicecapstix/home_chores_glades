import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

let admin = true;
vi.mock('../src/auth.js', () => ({ isAdmin: () => admin }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined),
  patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn().mockResolvedValue(undefined),
}));
import { writeState, patchPaths } from '../src/firebase.js';
import * as ui from '../src/ui.js';

const mkTasks = n => Object.fromEntries(Array.from({ length: n }, (_, i) => ['t' + i, { id: 't' + i, name: 'Chore ' + i, freq: 'daily', difficulty: 'easy' }]));
const toast = () => document.getElementById('toast').textContent;

beforeEach(() => {
  vi.clearAllMocks();
  admin = true;
  state.tasks = mkTasks(2);
  state.templates = {};
  state.nextId = 1;
  document.body.innerHTML = '<input id="tpl-name-input" value="Weekly"><div id="tpl-list"></div><div id="templates-modal" class="hidden"></div><div id="toast"></div>';
});

describe('saveTemplate', () => {
  it('refuses a template with zero chores', () => {
    state.tasks = {};
    ui.saveTemplate();
    expect(patchPaths).not.toHaveBeenCalled();
    expect(writeState).not.toHaveBeenCalled();
    expect(state.templates).toEqual({});
    expect(toast()).toMatch(/add some chores/i);
  });
  it('writes only templates/<id> for a valid save', () => {
    ui.saveTemplate();
    const id = Object.keys(state.templates)[0];
    expect(patchPaths).toHaveBeenCalledTimes(1);
    expect(Object.keys(patchPaths.mock.calls[0][0])).toEqual(['templates/' + id]);
    expect(writeState).not.toHaveBeenCalled();
  });
  it('refuses when 20 templates already exist', () => {
    for (let i = 0; i < 20; i++) state.templates['tpl' + i] = { id: 'tpl' + i, name: 'T' + i, tasks: [{ name: 'a', freq: 'daily' }] };
    ui.saveTemplate();
    expect(patchPaths).not.toHaveBeenCalled();
    expect(Object.keys(state.templates)).toHaveLength(20);
    expect(toast()).toMatch(/limit/i);
  });
  it('refuses more than 100 chores', () => {
    state.tasks = mkTasks(101);
    ui.saveTemplate();
    expect(patchPaths).not.toHaveBeenCalled();
    expect(toast()).toMatch(/too many/i);
  });
  it('is a no-op for non-admins', () => {
    admin = false;
    ui.saveTemplate();
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('legacy templates without tasks (Firebase drops empty arrays)', () => {
  beforeEach(() => { state.templates = { tplOld: { id: 'tplOld', name: 'Broken' } }; });
  it('openTemplates renders "0 tasks" instead of throwing and opens the modal', () => {
    expect(() => ui.openTemplates()).not.toThrow();
    expect(document.getElementById('tpl-list').textContent).toMatch(/0 tasks/);
    expect(document.getElementById('templates-modal').classList.contains('hidden')).toBe(false);
  });
  it('applyTemplate adds nothing and does not throw', () => {
    expect(() => ui.applyTemplate('tplOld')).not.toThrow();
    expect(Object.keys(state.tasks)).toHaveLength(2);
  });
  it('deleteTemplate nulls only that path', () => {
    vi.stubGlobal('confirm', () => true);
    ui.deleteTemplate('tplOld');
    expect(patchPaths).toHaveBeenCalledWith({ 'templates/tplOld': null });
    expect(state.templates.tplOld).toBeUndefined();
  });
});

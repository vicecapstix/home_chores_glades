import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

const cfg = vi.hoisted(() => ({ ro: false }));
vi.mock('../src/config.js', async orig => ({ ...(await orig()), get READONLY() { return cfg.ro; } }));
vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn(), patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn().mockResolvedValue(undefined), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchPaths } from '../src/firebase.js';
import { cardHTML } from '../src/render.js';
import { addTask, saveTask } from '../src/tasks.js';
import { templateTask, applyTemplate } from '../src/ui.js';
import { buildChoreFile, validateChoreFile } from '../src/chorefile.js';

const base = { id: 't1', name: 'Dishes', freq: 'daily', difficulty: 'easy', person: '', done: false, lastDone: 1, subtasks: {} };
const admin = () => true, notAdmin = () => false;

beforeEach(() => {
  vi.clearAllMocks(); cfg.ro = false;
  state.members = { Ann: { name: 'Ann', role: 'admin' } }; state.tasks = {}; state.templates = {}; state.nextId = 1;
  document.body.innerHTML = '<div id="toast"></div>';
});

describe('add (#297)', () => {
  function form(v) {
    document.body.innerHTML = '<div id="toast"></div><input id="new-task" value="Make bed"><select id="new-freq"><option value="daily" selected>d</option></select>' +
      '<select id="new-person"><option value="" selected></option></select><select id="new-diff"><option value="easy" selected></option></select>' +
      '<select id="new-cat"><option value="" selected></option></select><input id="new-duedate" value=""><div id="new-days" class="hidden"></div><textarea id="new-notes"></textarea>' +
      '<select id="new-timeofday"><option value="">any</option><option value="morning">m</option><option value="zzz">z</option></select>';
    document.getElementById('new-timeofday').value = v;
  }
  it('admin add saves the chosen time of day', async () => {
    form('morning'); await addTask(admin);
    expect(Object.values(state.tasks)[0].timeOfDay).toBe('morning');
  });
  it('omits the field when unset or not one of the three values', async () => {
    form(''); await addTask(admin);
    form('zzz'); await addTask(admin);
    expect(Object.values(state.tasks).every(t => !('timeOfDay' in t))).toBe(true);
  });
  it('non-admin add writes nothing', async () => {
    form('morning'); await addTask(notAdmin);
    expect(patchPaths).not.toHaveBeenCalled(); expect(state.tasks).toEqual({});
  });
});

describe('edit (#297)', () => {
  function editCard(v) {
    state.tasks.t1 = { ...base, timeOfDay: 'evening' };
    document.body.innerHTML = '<div id="tc-t1"><input class="edit-name" value="Dishes"><select class="edit-freq"><option value="daily" selected></option></select>' +
      '<div class="edit-days"></div><input class="edit-interval"><input class="edit-duedate"><input class="edit-duetime"><select class="edit-diff"><option value="easy" selected></option></select>' +
      '<select class="edit-cat"><option value="" selected></option></select><select class="edit-person"><option value="" selected></option></select>' +
      '<select class="edit-timeofday"><option value="">n</option><option value="morning">m</option><option value="afternoon">a</option><option value="bad">b</option></select><textarea class="edit-notes"></textarea></div>';
    document.querySelector('.edit-timeofday').value = v;
  }
  it('saveTask writes the new value, clears it when none, and rejects a bad one', async () => {
    editCard('afternoon'); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[0][0]['tasks/t1/timeOfDay']).toBe('afternoon');
    editCard(''); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[1][0]['tasks/t1/timeOfDay']).toBeNull();
    editCard('bad'); await saveTask('t1', admin);
    expect(patchPaths.mock.calls[2][0]['tasks/t1/timeOfDay']).toBeNull();
  });
  it('non-admin save writes nothing', async () => {
    editCard('morning'); await saveTask('t1', notAdmin);
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('templates and chore files keep it (#297)', () => {
  it('template round trip', () => {
    expect(templateTask({ ...base, timeOfDay: 'morning' }).timeOfDay).toBe('morning');
    expect(templateTask({ ...base, timeOfDay: 'bad' }).timeOfDay).toBeUndefined();
    state.templates = { tp: { id: 'tp', name: 'T', tasks: [{ name: 'X', freq: 'daily', timeOfDay: 'evening' }, { name: 'Y', freq: 'daily', timeOfDay: '<i>' }] } };
    document.body.innerHTML = '<div id="tpl-list"></div><div id="templates-modal" class="hidden"></div><div id="toast"></div>';
    applyTemplate('tp');
    const t = Object.values(state.tasks);
    expect(t.find(x => x.name === 'X').timeOfDay).toBe('evening');
    expect(t.find(x => x.name === 'Y').timeOfDay).toBeUndefined();
  });
  it('chore file download keeps it and upload validates it', () => {
    const file = buildChoreFile({ a: { ...base, id: 'a', timeOfDay: 'afternoon' }, b: { ...base, id: 'b', name: 'Other' } });
    expect(file.chores.find(c => c.name === 'Dishes').timeOfDay).toBe('afternoon');
    expect(file.chores.find(c => c.name === 'Other').timeOfDay).toBeUndefined();
    const v = validateChoreFile(JSON.stringify({ ...file, chores: [{ name: 'N1', freq: 'daily', timeOfDay: 'evening' }, { name: 'N2', freq: 'daily', timeOfDay: 'bad' }] }), {});
    expect(v.ok).toBe(true);
    const list = v.chores;
    expect(list.find(c => c.name === 'N1').timeOfDay).toBe('evening');
    expect(list.find(c => c.name === 'N2').timeOfDay).toBeUndefined();
  });
});

describe('card label (#297)', () => {
  it('shows a tag for each valid slot', () => {
    expect(cardHTML({ ...base, timeOfDay: 'morning' })).toContain('Morning');
    expect(cardHTML({ ...base, timeOfDay: 'afternoon' })).toContain('After school');
    expect(cardHTML({ ...base, timeOfDay: 'evening' })).toContain('Evening');
  });
  it('shows nothing for no value, and never renders a bad value', () => {
    expect(cardHTML(base)).not.toContain('🕒');
    const html = cardHTML({ ...base, timeOfDay: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('onerror'); expect(html).not.toContain('🕒');
  });
  it('TV (READONLY) shows the tag', () => {
    cfg.ro = true;
    expect(cardHTML({ ...base, timeOfDay: 'evening' })).toContain('Evening');
  });
});

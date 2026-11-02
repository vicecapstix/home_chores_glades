// #240: the "Parent check" flag (needsCheck) survives templates, the starter list, the chore file,
// the printable chart and shows "checked by" in history. Firebase mocked; no live database.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  patchPaths: vi.fn().mockResolvedValue(undefined),
}));
import { patchPaths } from '../src/firebase.js';
import * as ui from '../src/ui.js';
import { STARTER, openStarter, addStarterChores } from '../src/starter.js';
import { buildChoreFile, validateChoreFile, addPayload } from '../src/chorefile.js';
import { chartHTML } from '../src/printchart.js';
import { historyHTML } from '../src/history.js';

const admin = () => true;
const lastCall = () => patchPaths.mock.calls.at(-1)[0];

beforeEach(() => {
  vi.clearAllMocks();
  state.templates = {}; state.nextId = 1;
  state.tasks = {
    a: { id: 'a', name: 'Bathroom', freq: 'weekly', difficulty: 'medium', needsCheck: true, person: 'Al', done: false, lastDone: 0, order: 1 },
    b: { id: 'b', name: 'Bins', freq: 'daily', difficulty: 'easy', person: 'Al', done: false, lastDone: 0, order: 2 },
  };
  document.body.innerHTML = '<input id="tpl-name-input" value="Set"><div id="tpl-list"></div><div id="templates-modal" class="hidden"></div><div id="toast"></div>' +
    '<div id="starter-modal" class="hidden"><div id="starter-list"></div></div>';
});

describe('templates keep needsCheck (#240)', () => {
  it('save keeps the flag only where set; apply restores it', () => {
    ui.saveTemplate();
    const tpl = Object.values(state.templates)[0];
    expect(tpl.tasks[0].needsCheck).toBe(true);
    expect('needsCheck' in tpl.tasks[1]).toBe(false);
    state.tasks = {};
    ui.applyTemplate(tpl.id);
    const created = Object.values(lastCall()).filter(v => v && v.name);
    expect(created.find(t => t.name === 'Bathroom').needsCheck).toBe(true);
    expect('needsCheck' in created.find(t => t.name === 'Bins')).toBe(false);
  });
  it('a legacy template (no flag) still applies', () => {
    state.templates = { tp: { id: 'tp', name: 'Old', tasks: [{ name: 'X', freq: 'daily', difficulty: 'easy' }] } };
    state.tasks = {};
    ui.applyTemplate('tp');
    expect(Object.values(lastCall()).find(v => v && v.name === 'X').needsCheck).toBeUndefined();
  });
});

describe('starter list (#240)', () => {
  it('marks sensible chores and the modal shows the tag', () => {
    const flagged = STARTER.filter(s => s.needsCheck).map(s => s.name);
    expect(flagged).toEqual(expect.arrayContaining(['Clean the toilet', 'Tidy your room']));
    expect(flagged.length).toBeGreaterThan(0); expect(flagged.length).toBeLessThan(STARTER.length / 2);
    state.tasks = {};
    openStarter(admin);
    expect(document.getElementById('starter-list').textContent).toContain('Parent check');
  });
  it('adding a flagged starter chore creates it with needsCheck', async () => {
    state.tasks = {};
    await addStarterChores(['Clean the toilet', 'Make your bed'], admin);
    const made = Object.values(lastCall()).filter(v => v && v.name);
    expect(made.find(t => t.name === 'Clean the toilet').needsCheck).toBe(true);
    expect(made.find(t => t.name === 'Make your bed').needsCheck).toBeUndefined();
  });
});

describe('chore file (#240)', () => {
  it('download includes needsCheck only when set', () => {
    const f = buildChoreFile(state.tasks);
    expect(f.chores.find(c => c.name === 'Bathroom').needsCheck).toBe(true);
    expect('needsCheck' in f.chores.find(c => c.name === 'Bins')).toBe(false);
  });
  it('upload round-trips the flag; non-true values are ignored', () => {
    state.tasks = {};
    const r = validateChoreFile(JSON.parse(JSON.stringify(buildChoreFile({ a: { id: 'a', name: 'Bathroom', freq: 'weekly', needsCheck: true } }))));
    expect(r.chores[0].needsCheck).toBe(true);
    const bad = validateChoreFile({ kind: 'familyflow-chores', schemaVersion: 1, chores: [{ name: 'Z', freq: 'daily', needsCheck: 'yes' }] });
    expect(bad.chores[0].needsCheck).toBeUndefined();
    const { paths } = addPayload(r.chores, 5, 1000);
    expect(Object.values(paths).find(v => v && v.name === 'Bathroom').needsCheck).toBe(true);
  });
});

describe('printable chart (#240)', () => {
  it('shows a ✓ on flagged chores only, names still escaped', () => {
    state.tasks.a.name = '<b>Bath</b>';
    const html = chartHTML(state.tasks, ['Al'], '2026-10-19');
    expect(html).toContain('pc-check');
    expect(html.match(/pc-check/g)).toHaveLength(1);
    expect(html).not.toContain('<b>Bath');
  });
});

describe('history "checked by" (#240)', () => {
  const e = (o) => ({ taskId: 't', taskName: 'Bathroom', person: 'Al', completedAt: Date.now(), points: 2, ...o });
  it('shows who checked an approved completion, escaped', () => {
    const html = historyHTML([e({ checkedBy: 'Mum' }), e({ taskName: 'Bins', checkedBy: '<i>x</i>' }), e({ taskName: 'Plain' })], ['Al'], '', {});
    expect(html).toContain('checked by Mum');
    expect(html).toContain('checked by &lt;i&gt;x&lt;/i&gt;');
    expect(html.match(/checked by/g)).toHaveLength(2);
  });
});

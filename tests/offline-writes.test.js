import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { state } from '../src/state.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', async () => {
  const gate = await import('../src/writegate.js');
  return {
    setWritesEnabled: gate.setLive,
    writeState: vi.fn(), patchTask: vi.fn().mockResolvedValue(undefined), patchMember: vi.fn(), patchPaths: vi.fn().mockResolvedValue(undefined),
    patchRoot: vi.fn().mockResolvedValue(undefined), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
    spendPoints: vi.fn().mockResolvedValue(false), refundPoints: vi.fn(), decideRedemption: vi.fn().mockResolvedValue(false),
    adjustMemberPoints: vi.fn().mockResolvedValue({ ok: false, reason: 'readonly' }), appendHistory: vi.fn(), removeHistoryEntry: vi.fn(),
  };
});
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchPaths, patchRoot, spendPoints, decideRedemption, adjustMemberPoints, setWritesEnabled } from '../src/firebase.js';
import { CONNECTING_MSG } from '../src/writegate.js';
import * as ui from '../src/ui.js';
import { toggleTask, addTask, saveTask } from '../src/tasks.js';
import { requestReward, decideRequest } from '../src/redemptions.js';
import { setTeamGoal } from '../src/teamgoal.js';

const toast = () => document.getElementById('toast').textContent;
const admin = () => true;

beforeEach(() => {
  vi.clearAllMocks();
  setWritesEnabled(false);
  state.members = { Ann: { name: 'Ann', role: 'admin', points: 50 } };
  state.tasks = { a: { id: 'a', name: 'Dishes', freq: 'daily', done: false, lastDone: 0, person: 'Ann', difficulty: 'easy' } };
  state.rewards = { r1: { id: 'r1', name: 'Movie', cost: 20, icon: 'x' } };
  state.redemptions = { rd1: { id: 'rd1', status: 'pending', member: 'Ann', cost: 5, rewardName: 'x' } };
  state.templates = {}; state.nextId = 1;
  document.body.innerHTML = '<div id="toast"></div><input id="tpl-name-input" value="Weekly"><div id="tpl-list"></div><div id="templates-modal" class="hidden"></div>';
});
afterEach(() => setWritesEnabled(true));

describe('writes while the cached copy is showing (#216)', () => {
  it('toggleTask says still connecting and changes nothing', async () => {
    await toggleTask('a', () => 'Ann', admin);
    expect(toast()).toBe(CONNECTING_MSG);
    expect(state.tasks.a.done).toBe(false);
  });
  it('requestReward does not claim "Not enough points" or spend', async () => {
    await requestReward('r1', () => 'Ann');
    expect(toast()).toBe(CONNECTING_MSG);
    expect(spendPoints).not.toHaveBeenCalled();
  });
  it('decideRequest does not say "Already decided"', async () => {
    await decideRequest('rd1', 'approved', admin, () => 'Ann');
    expect(toast()).toBe(CONNECTING_MSG);
    expect(decideRedemption).not.toHaveBeenCalled();
  });
  it('saveTemplate shows no success toast and keeps no local template', () => {
    ui.saveTemplate();
    expect(toast()).toBe(CONNECTING_MSG);
    expect(Object.keys(state.templates)).toHaveLength(0);
  });
  it('applyTemplate shows no success toast and adds no tasks', () => {
    state.templates = { tpl1: { id: 'tpl1', name: 'T', tasks: [{ name: 'X', freq: 'daily', difficulty: 'easy' }] } };
    ui.applyTemplate('tpl1');
    expect(toast()).toBe(CONNECTING_MSG);
    expect(Object.keys(state.tasks)).toEqual(['a']);
  });
  it('setTeamGoal shows no success toast', async () => {
    expect(await setTeamGoal(100, 'Pizza', admin)).toBe(false);
    expect(toast()).toBe(CONNECTING_MSG);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('addTask and saveTask do not write', async () => {
    document.body.insertAdjacentHTML('beforeend', '<input id="new-task" value="Z"><select id="new-freq"><option value="daily"></option></select><select id="new-person"><option value=""></option></select><select id="new-diff"><option>easy</option></select><select id="new-cat"><option value=""></option></select><input id="new-duedate"><div id="new-days"></div><textarea id="new-notes"></textarea>');
    await addTask(admin);
    expect(patchPaths).not.toHaveBeenCalled();
    expect(Object.keys(state.tasks)).toEqual(['a']);
  });
  it('works normally once live', async () => {
    setWritesEnabled(true);
    ui.saveTemplate();
    expect(toast()).toBe('Template saved');
  });
});

describe('firebase helper reason + banner text', () => {
  it('adjustMemberPoints reports offline (real helper, gate off)', async () => {
    vi.resetModules();
    vi.doMock('firebase/app', () => ({ initializeApp: vi.fn() }));
    vi.doMock('firebase/database', () => ({ getDatabase: () => ({}), ref: vi.fn(), set: vi.fn(), remove: vi.fn(), update: vi.fn(), onValue: vi.fn(), runTransaction: vi.fn() }));
    vi.doMock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
    vi.doUnmock('../src/firebase.js');
    const fb = await vi.importActual('../src/firebase.js');
    fb.initFirebase();
    fb.setWritesEnabled(false);
    expect(await fb.adjustMemberPoints('Ann', { pts: 1 })).toMatchObject({ ok: false, reason: 'offline' });
    expect(await fb.spendPoints('Ann', 1)).toBe(false);
  });
  it('cache banner no longer implies changes will sync', () => {
    const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
    const m = html.match(/id="cache-banner"[^>]*>([^<]*)</);
    expect(m[1]).toMatch(/can.t be saved/);
  });
});

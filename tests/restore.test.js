import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ patchRoot: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn(), patchMember: vi.fn(), spendPoints: vi.fn(), refundPoints: vi.fn(), decideRedemption: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), MAX_TEMPLATES: 20, MAX_TEMPLATE_TASKS: 100 }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import * as fb from '../src/firebase.js';
import { buildBackup } from '../src/backup.js';
import { validateBackup, restorePayload, prepareRestore, onRestoreInput, confirmRestore, cancelRestore } from '../src/restore.js';

const admin = () => true, member = () => false;
const NOW = new Date(2026, 9, 19, 9, 0, 0);
const good = (o = {}) => ({
  schemaVersion: 1, exportedAt: NOW.toISOString(), nextId: 10,
  members: { Al: { name: 'Al', role: 'admin', points: 5, pinHash: 'EVIL' }, Bo: { name: 'Bo', role: 'member', points: 2 } },
  tasks: { t1: { id: 't1', name: 'Dishes', freq: 'daily' } },
  history: [{ taskId: 't1', person: 'Al', completedAt: 1, points: 1 }],
  templates: {}, rewards: { r1: { id: 'r1', name: 'Pizza', cost: 20, icon: '🍕' } }, redemptions: {}, ...o,
});
const file = obj => ({ text: () => Promise.resolve(typeof obj === 'string' ? obj : JSON.stringify(obj)) });

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state, { members: { Al: { name: 'Al', role: 'admin', pinHash: 'KEEP' } }, nextId: 12 });
  document.body.innerHTML = '<div id="restore-modal" class="hidden"><div id="restore-summary"></div><input id="restore-confirm"/><button id="restore-go" disabled></button></div><div id="toast"></div>';
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:x'); globalThis.URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

describe('validation', () => {
  it('accepts a good backup and summarises it', () => {
    const r = validateBackup(JSON.stringify(good()));
    expect(r.ok).toBe(true);
    expect(r.summary).toMatchObject({ members: 2, chores: 1, history: 1, skipped: 0 });
    expect(r.summary.exportedAt).toBe(NOW.toISOString());
  });
  it('accepts a real buildBackup output (round trip)', () => {
    Object.assign(state, { tasks: { t1: { id: 't1', name: 'X', freq: 'weekly' } }, history: [], templates: {}, rewards: {}, redemptions: {} });
    expect(validateBackup(buildBackup(state, NOW)).ok).toBe(true);
  });
  it('rejects bad JSON, wrong schemaVersion and wrong shape', () => {
    expect(validateBackup('{nope').ok).toBe(false);
    expect(validateBackup(good({ schemaVersion: 2 })).ok).toBe(false);
    expect(validateBackup(good({ schemaVersion: undefined })).ok).toBe(false);
    expect(validateBackup([]).ok).toBe(false);
    expect(validateBackup(good({ members: 'x' })).ok).toBe(false);
    expect(validateBackup(good({ tasks: [1] })).ok).toBe(false);
  });
  it('requires at least one valid admin member', () => {
    expect(validateBackup(good({ members: { Bo: { name: 'Bo', role: 'member' } } })).error).toMatch(/admin/);
    expect(validateBackup(good({ members: {} })).ok).toBe(false);
  });
  it('validates names like the add path and skips bad chores', () => {
    const r = validateBackup(good({
      members: { Al: { name: 'Al', role: 'admin' }, 'B.o': { name: 'B.o', role: 'member' }, Long: { name: 'x'.repeat(31), role: 'member' } },
      tasks: { t1: { id: 't1', name: 'ok', freq: 'daily' }, t2: { id: 't2', name: '', freq: 'daily' }, t3: { id: 't3', name: 'x', freq: 'bogus' }, 'a/b': { id: 'a/b', name: 'x', freq: 'daily' } },
    }));
    expect(Object.keys(r.clean.members)).toEqual(['Al']);
    expect(Object.keys(r.clean.tasks)).toEqual(['t1']);
    expect(r.summary.skipped).toBe(5);
  });
});

describe('PIN preservation', () => {
  it('never imports a pinHash and keeps the current one by name', () => {
    const r = validateBackup(good());
    expect(r.clean.members.Al.pinHash).toBe('KEEP');
    expect(r.clean.members.Bo.pinHash).toBe('');
    expect(JSON.stringify(r.clean)).not.toContain('EVIL');
  });
});

describe('caps', () => {
  it('history <= 500, redemptions <= 100 (newest kept), rewards <= 50, templates <= 20 with <= 100 tasks', () => {
    const history = Array.from({ length: 600 }, (_, i) => ({ completedAt: i + 1, points: 1, person: 'Al' }));
    const redemptions = Object.fromEntries(Array.from({ length: 130 }, (_, i) => ['rd' + i, { id: 'rd' + i, member: 'Al', status: 'approved', requestedAt: i }]));
    const rewards = Object.fromEntries(Array.from({ length: 60 }, (_, i) => ['r' + i, { id: 'r' + i, name: 'R' + i, cost: 5 }]));
    const tplTasks = Array.from({ length: 150 }, () => ({ name: 'x', freq: 'daily' }));
    const templates = Object.fromEntries(Array.from({ length: 25 }, (_, i) => ['tpl' + i, { id: 'tpl' + i, name: 'T' + i, tasks: tplTasks }]));
    const c = validateBackup(good({ history, redemptions, rewards, templates })).clean;
    expect(c.history).toHaveLength(500);
    expect(Object.keys(c.redemptions)).toHaveLength(100);
    expect(c.redemptions.rd129).toBeTruthy();
    expect(c.redemptions.rd0).toBeUndefined();
    expect(Object.keys(c.rewards)).toHaveLength(50);
    expect(Object.keys(c.templates)).toHaveLength(20);
    expect(c.templates.tpl0.tasks).toHaveLength(100);
  });
  it('invalid rewards (cost out of range) are skipped', () => {
    const c = validateBackup(good({ rewards: { a: { id: 'a', name: 'A', cost: 0 }, b: { id: 'b', name: 'B', cost: 5 } } })).clean;
    expect(Object.keys(c.rewards)).toEqual(['b']);
  });
});

describe('payload', () => {
  it('keeps nextId from going backwards and nulls empty collections', () => {
    const p = restorePayload(validateBackup(good({ nextId: 3, tasks: {}, rewards: {}, history: [] })).clean, 12);
    expect(p.nextId).toBe(12);
    expect(p.tasks).toBeNull(); expect(p.rewards).toBeNull(); expect(p.history).toBeNull();
    expect(Object.keys(p).sort()).toEqual(['history', 'members', 'nextId', 'redemptions', 'rewards', 'tasks', 'templates']);
  });
  it('uses the file nextId when larger', () => {
    expect(restorePayload(validateBackup(good({ nextId: 99 })).clean, 12).nextId).toBe(99);
  });
});

describe('flow and guards', () => {
  it('non-admin cannot even load a file', async () => {
    expect(await prepareRestore(file(good()), member)).toBe(false);
    expect(document.getElementById('restore-modal').classList.contains('hidden')).toBe(true);
  });
  it('invalid file shows no modal and writes nothing', async () => {
    expect(await prepareRestore(file('garbage'), admin)).toBe(false);
    expect(fb.patchRoot).not.toHaveBeenCalled();
  });
  it('needs RESTORE typed; downloads safety backup first then one patchRoot', async () => {
    expect(await prepareRestore(file(good()), admin)).toBe(true);
    expect(document.getElementById('restore-summary').textContent).toMatch(/2 members/);
    onRestoreInput('restore');
    expect(document.getElementById('restore-go').disabled).toBe(true);
    expect(await confirmRestore('restore', admin)).toBe(false);
    expect(fb.patchRoot).not.toHaveBeenCalled();
    onRestoreInput('RESTORE');
    expect(document.getElementById('restore-go').disabled).toBe(false);
    expect(await confirmRestore('RESTORE', admin)).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(fb.patchRoot).toHaveBeenCalledTimes(1);
    const p = fb.patchRoot.mock.calls[0][0];
    expect(p.nextId).toBe(12);
    expect(p.members.Al.pinHash).toBe('KEEP');
    expect(Object.keys(p.tasks)).toEqual(['t1']);
    expect(URL.createObjectURL.mock.invocationCallOrder[0]).toBeLessThan(fb.patchRoot.mock.invocationCallOrder[0]);
  });
  it('aborts when the safety backup fails', async () => {
    await prepareRestore(file(good()), admin);
    URL.createObjectURL = vi.fn(() => { throw new Error('x'); });
    expect(await confirmRestore('RESTORE', admin)).toBe(false);
    expect(fb.patchRoot).not.toHaveBeenCalled();
  });
  it('member cannot confirm; cancel clears the pending file', async () => {
    await prepareRestore(file(good()), admin);
    expect(await confirmRestore('RESTORE', member)).toBe(false);
    cancelRestore();
    expect(await confirmRestore('RESTORE', admin)).toBe(false);
    expect(fb.patchRoot).not.toHaveBeenCalled();
  });
  it('summary escapes dates and shows skipped count', async () => {
    await prepareRestore(file(good({ exportedAt: '<img src=x>', tasks: { a: { id: 'a', name: '', freq: 'daily' } } })), admin);
    expect(document.getElementById('restore-summary').querySelector('img')).toBeNull();
    expect(document.getElementById('restore-summary').textContent).toMatch(/1 invalid/);
  });
});

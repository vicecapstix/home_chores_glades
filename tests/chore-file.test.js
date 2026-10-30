// #234: download / upload the chore list as a file. Firebase is mocked; no live database.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/firebase.js', () => ({ patchPaths: vi.fn().mockResolvedValue(undefined) }));
import { patchPaths } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import {
  buildChoreFile, choreFilename, downloadChores, validateChoreFile, addPayload,
  prepareChoreUpload, confirmChoreUpload, cancelChoreUpload, MAX_CHORES, MAX_FILE_BYTES,
} from '../src/chorefile.js';

const admin = () => true, notAdmin = () => false;
const NOW = new Date(2026, 9, 30, 9, 0, 0);
const file = (obj, size) => { const text = typeof obj === 'string' ? obj : JSON.stringify(obj); return { size: size ?? text.length, text: async () => text }; };
const wrap = chores => ({ kind: 'familyflow-chores', schemaVersion: 1, chores });
const good = (over = {}) => ({ name: 'Wipe table', freq: 'daily', difficulty: 'easy', category: 'Kitchen', notes: '', ...over });

beforeEach(() => {
  vi.clearAllMocks();
  state.nextId = 10;
  state.members = { Ann: { name: 'Ann', role: 'admin', points: 40, pinHash: 'secret' } };
  state.history = [{ person: 'Ann', points: 3 }];
  state.tasks = {
    a: { id: 'a', name: 'Dishes', freq: 'daily', person: 'Ann', done: true, lastDone: 5, lastDoneBy: 'Ann', difficulty: 'easy', category: 'Kitchen', notes: 'Hot water', dueDate: '', order: 1,
      subtasks: { s1: { id: 's1', name: 'Plates', done: true }, s2: { id: 's2', name: 'Cups', done: false } } },
    b: { id: 'b', name: 'Bins', freq: 'weekdays', days: [1, 4], person: '', done: false, lastDone: 6, difficulty: 'medium', category: '', notes: '', dueTime: '18:00', order: 2, subtasks: {} },
    c: { id: 'c', name: 'Pool', freq: 'interval', intervalDays: 3, person: 'Ann', done: false, lastDone: 7, difficulty: 'hard', category: 'Garden', notes: '', order: 3 },
    d: { id: 'd', name: 'Pay bill', freq: 'once', dueDate: '2026-12-01', person: '', done: false, lastDone: 8, difficulty: 'easy', category: '', notes: '', order: 4 },
  };
  document.body.innerHTML = '<div id="chores-upload-modal" class="hidden"><div id="chores-upload-summary"></div><button id="chores-upload-go"></button></div>';
});
afterEach(() => cancelChoreUpload());

describe('download (AC1)', () => {
  it('contains only chore definitions, never people, state, points, history or members', () => {
    const f = buildChoreFile(state.tasks, NOW);
    const text = JSON.stringify(f);
    expect(f.chores.map(c => c.name)).toEqual(['Dishes', 'Bins', 'Pool', 'Pay bill']);
    expect(f.chores[0]).toEqual({ name: 'Dishes', freq: 'daily', difficulty: 'easy', category: 'Kitchen', notes: 'Hot water', subtasks: ['Plates', 'Cups'] });
    expect(f.chores[1]).toMatchObject({ days: [1, 4], dueTime: '18:00' });
    expect(f.chores[2].intervalDays).toBe(3);
    expect(f.chores[3].dueDate).toBe('2026-12-01');
    for (const k of ['person', 'done', 'lastDone', 'lastDoneBy', 'points', 'pinHash', 'secret', 'history', 'members', '"id"', 'order']) expect(text).not.toContain(k);
  });
  it('names the file by local date', () => { expect(choreFilename(NOW)).toBe('familyflow-chores-2026-10-30.json'); });
  it('downloads for an admin from local state only, and not for a non-admin', () => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x'); globalThis.URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(downloadChores(notAdmin)).toBe(false);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(downloadChores(admin)).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1); expect(click).toHaveBeenCalled();
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('validation (AC2)', () => {
  it('round-trips: export then import gives the same definitions', () => {
    const f = buildChoreFile(state.tasks, NOW);
    const r = validateChoreFile(JSON.stringify(f), {});
    expect(r.ok).toBe(true); expect(r.invalid).toEqual([]);
    expect(r.chores).toEqual(f.chores.map(c => ({ ...c, subtasks: c.subtasks || [] })));
  });
  it('rejects bad freq, difficulty, long names and notes, bad days, interval, date, time and subtasks', () => {
    const r = validateChoreFile(wrap([
      good({ freq: 'hourly' }), good({ difficulty: 'brutal' }), good({ name: 'x'.repeat(101) }), good({ name: '   ' }),
      good({ notes: 'n'.repeat(301) }), good({ freq: 'weekdays', days: [] }), good({ freq: 'weekdays', days: [9] }),
      good({ freq: 'interval', intervalDays: 1 }), good({ freq: 'once', dueDate: 'tomorrow' }), good({ dueTime: '25:00' }),
      good({ subtasks: Array(21).fill('a') }), good({ subtasks: [5] }), 'nope',
    ]), {});
    expect(r.ok).toBe(true); expect(r.chores).toEqual([]); expect(r.invalid).toHaveLength(13);
    expect(r.invalid[0]).toMatchObject({ index: 1 }); expect(r.invalid.every(i => i.reason)).toBe(true);
  });
  it('clears a category that is not one of the app categories, keeps a valid one', () => {
    const r = validateChoreFile(wrap([good({ name: 'A', category: 'Spaceship' }), good({ name: 'B', category: 'Garden' })]), {});
    expect(r.chores.map(c => c.category)).toEqual(['', 'Garden']);
  });
  it('drops unknown fields so a file cannot inject people, state or points', () => {
    const r = validateChoreFile(wrap([good({ person: 'Ann', done: true, points: 999, id: 'x', lastDone: 1 })]), {});
    expect(Object.keys(r.chores[0]).sort()).toEqual(['category', 'difficulty', 'freq', 'name', 'notes', 'subtasks']);
  });
  it('refuses more than 200 chores, a wrong file type, bad JSON and a file over 200 KB', () => {
    expect(validateChoreFile(wrap(Array.from({ length: MAX_CHORES + 1 }, (_, i) => good({ name: 'c' + i }))), {}).error).toMatch(/200/);
    expect(validateChoreFile(wrap(Array.from({ length: MAX_CHORES }, (_, i) => good({ name: 'c' + i }))), {}).ok).toBe(true);
    expect(validateChoreFile({ kind: 'familyflow-backup', chores: [] }, {}).ok).toBe(false);
    expect(validateChoreFile('{oops', {}).ok).toBe(false);
    expect(validateChoreFile('x'.repeat(MAX_FILE_BYTES + 1), {}).ok).toBe(false);
  });
});

describe('preview and add (AC3, AC4)', () => {
  it('skips names that already exist (any case) or repeat in the file, and says so', async () => {
    const f = file(wrap([good({ name: 'dishes' }), good({ name: 'New one' }), good({ name: 'NEW ONE' }), good({ name: 'x'.repeat(101) })]));
    expect(await prepareChoreUpload(f, admin)).toBe(true);
    const html = document.getElementById('chores-upload-summary').innerHTML;
    expect(html).toContain('1 new'); expect(html).toContain('2 already exist'); expect(html).toContain('1 invalid');
    expect(document.getElementById('chores-upload-modal').classList.contains('hidden')).toBe(false);
    expect(patchPaths).not.toHaveBeenCalled();
  });
  it('escapes chore names and reasons in the preview', async () => {
    await prepareChoreUpload(file(wrap([good({ name: '<img src=x onerror=alert(1)>', freq: 'bogus' }), good({ name: '<b>ok</b>' })])), admin);
    const html = document.getElementById('chores-upload-summary').innerHTML;
    expect(html).not.toContain('<img'); expect(html).not.toContain('<b>ok'); expect(html).toContain('&lt;b&gt;ok');
  });
  it('adds as Anyone, not done, in one multi-path update with nextId, deleting nothing', async () => {
    await prepareChoreUpload(file(wrap([good({ name: 'One', subtasks: ['s'] }), good({ name: 'Two', freq: 'weekdays', days: [2] }), good({ name: 'Three', freq: 'interval', intervalDays: 4 })])), admin);
    expect(await confirmChoreUpload(admin)).toBe(3);
    expect(patchPaths).toHaveBeenCalledTimes(1);
    const paths = patchPaths.mock.calls[0][0];
    const keys = Object.keys(paths);
    expect(keys.filter(k => k.startsWith('tasks/'))).toHaveLength(3);
    expect(paths.nextId).toBe(13);
    expect(Object.values(paths).every(v => v !== null)).toBe(true);
    const made = Object.values(paths).filter(v => v && v.name);
    expect(made.every(t => t.person === '' && t.done === false && typeof t.lastDone === 'number')).toBe(true);
    expect(made.find(t => t.name === 'One').subtasks).toEqual({ [Object.keys(made.find(t => t.name === 'One').subtasks)[0]]: expect.objectContaining({ name: 's', done: false }) });
    expect(made.find(t => t.name === 'Two').days).toEqual([2]);
    expect(made.find(t => t.name === 'Three').intervalDays).toBe(4);
    expect(state.tasks.a.name).toBe('Dishes');
  });
  it('re-checks duplicates at Add time and never overwrites an existing chore id', async () => {
    await prepareChoreUpload(file(wrap([good({ name: 'Late' })])), admin);
    state.tasks.z = { id: 'z', name: 'late', freq: 'daily' };
    expect(await confirmChoreUpload(admin)).toBe(0);
    expect(patchPaths).not.toHaveBeenCalled();
  });
  it('addPayload uses fresh ids, none of them an existing task', () => {
    const { paths } = addPayload([good({ name: 'N1' }), good({ name: 'N2' })], 10, 1000);
    expect(Object.keys(paths).sort()).toEqual(['nextId', 'tasks/t1000', 'tasks/t1001']);
  });
  it('cancel clears the pending upload', async () => {
    await prepareChoreUpload(file(wrap([good({ name: 'Once' })])), admin);
    cancelChoreUpload();
    expect(await confirmChoreUpload(admin)).toBe(0); expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('guards (AC5)', () => {
  it('non-admins cannot prepare or confirm an upload', async () => {
    expect(await prepareChoreUpload(file(wrap([good()])), notAdmin)).toBe(false);
    await prepareChoreUpload(file(wrap([good({ name: 'Mine' })])), admin);
    expect(await confirmChoreUpload(notAdmin)).toBe(0);
    expect(patchPaths).not.toHaveBeenCalled();
  });
  it('a file over 200 KB is refused before it is read', async () => {
    const f = file(wrap([good()]), MAX_FILE_BYTES + 1); f.text = vi.fn();
    expect(await prepareChoreUpload(f, admin)).toBe(false);
    expect(f.text).not.toHaveBeenCalled(); expect(showToast).toHaveBeenCalled();
  });
  it('an invalid file shows a message and opens no preview', async () => {
    expect(await prepareChoreUpload(file('not json'), admin)).toBe(false);
    expect(document.getElementById('chores-upload-modal').classList.contains('hidden')).toBe(true);
  });
});

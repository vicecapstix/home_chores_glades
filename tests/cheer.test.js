import { describe, it, expect, beforeEach, vi } from 'vitest';

const db = {};
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), onValue: vi.fn(), remove: vi.fn(), set: vi.fn(), update: vi.fn(),
  runTransaction: vi.fn(async (p, fn) => { const n = fn(db[p] ?? null); if (n === undefined) return { committed: false }; db[p] = n; return { committed: true }; }),
}));

const entry = (n, over = {}) => ({ taskId: 't' + n, taskName: 'Bins', person: 'Bo', completedAt: n, points: 2, ...over });
let fb, state, C, H, toast;

async function load(readonly = false) {
  vi.resetModules();
  vi.doMock('../src/config.js', async orig => ({ ...(await orig()), READONLY: readonly }));
  toast = vi.fn();
  vi.doMock('../src/ui.js', () => ({ showToast: toast }));
  fb = await import('../src/firebase.js'); fb.initFirebase();
  state = (await import('../src/state.js')).state;
  H = await import('../src/history.js');
  C = await import('../src/cheer.js');
  state.members = { Mum: { name: 'Mum', role: 'admin' }, Bo: { name: 'Bo', role: 'member' } };
}
beforeEach(() => {
  Object.keys(db).forEach(k => delete db[k]);
  localStorage.clear();
  document.body.innerHTML = '<div id="history-filters"></div><div id="history-list"></div><div id="cheer-banner" class="hidden"><span id="cheer-banner-text"></span></div>';
});
const click = () => ({ target: { closest: () => ({ dataset: { cheerAt: '5', cheerPerson: 'Bo', cheerTask: 't5' } }) } });

describe('cheer write (#403)', () => {
  it('admin cheer writes only that one entry field', async () => {
    await load();
    db['state/history'] = [entry(1), entry(5)];
    state.history = [entry(1), entry(5)];
    db['state/history/1'] = entry(5);
    await C.cheerClick(click(), () => true, () => 'Mum');
    expect(db['state/history/1'].cheer).toBe('Mum');
    expect(db['state/history']).toEqual([entry(1), entry(5)]); // array not rewritten
    expect(state.history[1].cheer).toBe('Mum');
  });
  it('once per entry', async () => {
    await load();
    db['state/history/0'] = entry(5, { cheer: 'Dad' });
    const r = await fb.cheerHistoryEntry(0, { completedAt: 5, person: 'Bo', taskId: 't5' }, 'Mum');
    expect(r.cheered).toBe(false);
    expect(db['state/history/0'].cheer).toBe('Dad');
  });
  it('does not write when the live entry changed', async () => {
    await load();
    db['state/history/0'] = entry(9);
    const r = await fb.cheerHistoryEntry(0, { completedAt: 5, person: 'Bo', taskId: 't5' }, 'Mum');
    expect(r.ok).toBe(false);
    expect(db['state/history/0']).toEqual(entry(9));
  });
  it('non-admin cannot cheer', async () => {
    await load();
    state.history = [entry(5)]; db['state/history/0'] = entry(5);
    await C.cheerClick(click(), () => false, () => 'Bo');
    expect(db['state/history/0'].cheer).toBeUndefined();
  });
  it('READONLY cannot cheer', async () => {
    await load(true);
    state.history = [entry(5)]; db['state/history/0'] = entry(5);
    await C.cheerClick(click(), () => true, () => 'Mum');
    expect(db['state/history/0'].cheer).toBeUndefined();
    expect(await fb.cheerHistoryEntry(0, { completedAt: 5, person: 'Bo' }, 'Mum')).toEqual({ ok: false, cheered: false });
  });
  it('write failure toasts', async () => {
    await load();
    state.history = [entry(5)];
    const { runTransaction } = await import('firebase/database');
    runTransaction.mockRejectedValueOnce(new Error('boom'));
    await C.cheerClick(click(), () => true, () => 'Mum');
    expect(toast).toHaveBeenCalled();
  });
});

describe('History 👏 (#403)', () => {
  it('admin sees a button on a chore completion, not on bonus rows or for members', async () => {
    await load();
    const h = [entry(5), { type: 'bonus', taskName: 'Bonus: x', reason: 'x', person: 'Bo', points: 3, completedAt: 6 }];
    const admin = H.historyHTML(h, ['Mum', 'Bo'], '', {}, { canCheer: true });
    expect(admin.match(/hist-cheer-btn/g)).toHaveLength(1);
    expect(H.historyHTML(h, ['Mum', 'Bo'], '', {}, { canCheer: false })).not.toContain('hist-cheer-btn');
  });
  it('cheered entry shows 👏 and no button; names escaped', async () => {
    await load();
    const html = H.historyHTML([entry(5, { person: '<b>Bo</b>', cheer: '<i>Mum</i>' })], [], '', {}, { canCheer: true });
    expect(html).toContain('👏');
    expect(html).not.toContain('hist-cheer-btn');
    expect(html).not.toContain('<i>');
    expect(html).toContain('&lt;i&gt;Mum');
  });
});

describe('cheer banner (#403)', () => {
  const text = () => document.getElementById('cheer-banner-text').textContent;
  const shown = () => !document.getElementById('cheer-banner').classList.contains('hidden');
  it('shown once per device, then not again', async () => {
    await load();
    const h = [entry(5, { cheer: 'Mum' })];
    C.renderCheerBanner(h, 'Bo');
    expect(shown()).toBe(true);
    expect(text()).toBe('👏 Mum cheered your Bins');
    C.hideCheer();
    C.renderCheerBanner(h, 'Bo');
    expect(shown()).toBe(false);
  });
  it('only for the cheered member', async () => {
    await load();
    C.renderCheerBanner([entry(5, { cheer: 'Mum' })], 'Sue');
    expect(shown()).toBe(false);
  });
  it('names are escaped', async () => {
    await load();
    C.renderCheerBanner([entry(5, { taskName: '<img src=x>', cheer: '<b>M</b>' })], 'Bo');
    const el = document.getElementById('cheer-banner-text');
    expect(el.querySelector('img,b')).toBeNull();
    expect(el.textContent).toContain('<img src=x>');
  });
  it('never on the readonly TV', async () => {
    await load(true);
    C.renderCheerBanner([entry(5, { cheer: 'Mum' })], 'Bo');
    expect(shown()).toBe(false);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { saveSnapshot, loadSnapshot, clearSnapshot, setCacheBanner, CACHE_KEY, MAX_BYTES } from '../src/cache.js';

const src = f => readFileSync(resolve(__dirname, '../src', f), 'utf8');
const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, removeItem: k => { delete m[k]; }, m }; };
const snap = () => ({
  members: { A: { name: 'A', role: 'admin', pinHash: 'secret', points: 3 } },
  tasks: { t1: { id: 't1', name: 'x' } }, rewards: {}, pause: null, redemptions: { r: {} },
  history: Array.from({ length: 80 }, (_, i) => ({ taskId: i })), nextId: 5,
});

describe('offline snapshot cache', () => {
  let st;
  beforeEach(() => { st = mem(); });

  it('writes without pinHash or redemptions; history limited to 50', () => {
    expect(saveSnapshot(snap(), st)).toBe(true);
    const raw = st.m[CACHE_KEY];
    expect(raw).not.toContain('pinHash');
    expect(raw).not.toContain('secret');
    const v = JSON.parse(raw);
    expect(v.history).toHaveLength(50);
    expect(v.redemptions).toBeUndefined();
    expect(v.members.A.points).toBe(3);
  });

  it('skips writing over the size cap and keeps old copy', () => {
    saveSnapshot(snap(), st);
    const before = st.m[CACHE_KEY];
    const big = snap(); big.tasks = { t: { name: 'x'.repeat(MAX_BYTES) } };
    expect(saveSnapshot(big, st)).toBe(false);
    expect(st.m[CACHE_KEY]).toBe(before);
  });

  it('never throws when storage fails or data is corrupt', () => {
    const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
    expect(saveSnapshot(snap(), bad)).toBe(false);
    expect(loadSnapshot(bad)).toBeNull();
    expect(clearSnapshot(bad)).toBe(false);
    st.m[CACHE_KEY] = '{nope';
    expect(loadSnapshot(st)).toBeNull();
  });

  it('load round-trips and clear removes it', () => {
    saveSnapshot(snap(), st);
    expect(loadSnapshot(st).tasks.t1.name).toBe('x');
    clearSnapshot(st);
    expect(loadSnapshot(st)).toBeNull();
  });

  it('banner toggles', () => {
    document.body.innerHTML = '<div id="cache-banner" class="hidden"></div>';
    setCacheBanner(true);
    expect(document.getElementById('cache-banner').classList.contains('hidden')).toBe(false);
    setCacheBanner(false);
    expect(document.getElementById('cache-banner').classList.contains('hidden')).toBe(true);
  });

  it('main starts from cache read-only and live snapshot takes over', () => {
    const m = src('main.js');
    const off = m.indexOf('setWritesEnabled(false)');
    const listener = m.indexOf("onValue(ref(db, 'state')");
    expect(off).toBeGreaterThan(-1);
    expect(off).toBeLessThan(listener);
    const live = m.slice(listener);
    expect(live).toContain('setWritesEnabled(true)');
    expect(live).toContain('setCacheBanner(false)');
    expect(live).toContain('saveSnapshot(state)');
  });

  it('write helpers refuse while showing cached data', async () => {
    vi.resetModules();
    vi.doMock('firebase/app', () => ({ initializeApp: vi.fn() }));
    const set = vi.fn(), update = vi.fn();
    vi.doMock('firebase/database', () => ({ getDatabase: () => ({}), ref: vi.fn(), set, remove: vi.fn(), update, onValue: vi.fn(), runTransaction: vi.fn() }));
    vi.doMock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
    const fb = await import('../src/firebase.js');
    fb.initFirebase();
    fb.setWritesEnabled(false);
    await fb.writeState();
    await fb.patchTask('t1', { done: true });
    expect(set).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    fb.setWritesEnabled(true);
    await fb.patchTask('t1', { done: true });
    expect(update).toHaveBeenCalled();
  });

  it('logout leaves the cache alone; clear button is wired', () => {
    expect(src('auth.js')).not.toContain('familyflow-snapshot');
    expect(src('index.html')).toContain('clearSavedData');
  });
});

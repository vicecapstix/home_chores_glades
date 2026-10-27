// #40: main.js bootstrap order with a mocked Firebase SDK — the module is really
// imported and run (not read as text). No network, no live database.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
const body = html.slice(html.indexOf('<body'), html.lastIndexOf('</body>')).replace(/^<body[^>]*>/, '').replace(/<script[\s\S]*?<\/script>/g, '');

const h = vi.hoisted(() => ({ calls: [], listeners: {}, cached: null }));

vi.mock('firebase/database', async orig => ({
  ...(await orig()),
  ref: (_db, path) => path,
  onValue: (path, cb, err) => { h.listeners[path] = { cb, err }; return () => {}; },
}));
vi.mock('../src/firebase.js', async orig => ({
  ...(await orig()),
  initFirebase: () => ({ app: {}, db: {} }),
  initAuth: async () => { h.calls.push('initAuth'); return { ok: true }; },
  setWritesEnabled: on => h.calls.push('writes:' + on),
}));
vi.mock('../src/state.js', async orig => {
  const o = await orig();
  return { ...o, applySnapshot: v => { h.calls.push('applySnapshot'); return o.applySnapshot(v); } };
});
vi.mock('../src/tasks.js', async orig => ({ ...(await orig()), checkTaskResets: () => h.calls.push('checkTaskResets') }));
vi.mock('../src/render.js', async orig => ({ ...(await orig()), render: () => h.calls.push('render') }));
vi.mock('../src/cache.js', async orig => ({
  ...(await orig()),
  loadSnapshot: () => h.cached,
  saveSnapshot: () => h.calls.push('saveSnapshot'),
  setCacheBanner: on => h.calls.push('cacheBanner:' + on),
}));
vi.mock('../src/auth.js', async orig => ({ ...(await orig()), handleFirstLoad: () => h.calls.push('handleFirstLoad') }));
vi.mock('../src/pwa.js', () => ({ registerServiceWorker: () => {} }));
vi.mock('../src/connection.js', async orig => ({ ...(await orig()), watchConnection: () => {}, markSynced: () => h.calls.push('markSynced') }));

const flush = () => new Promise(r => setTimeout(r, 0));
const live = { nextId: 3, members: { Ann: { name: 'Ann', role: 'admin', pinHash: '' } }, tasks: { t1: { id: 't1', name: 'Dishes', freq: 'daily', done: false, lastDone: 0 } } };

async function boot(search = '') {
  vi.resetModules();
  window.history.replaceState(null, '', '/' + search);
  document.body.innerHTML = body;
  await import('../src/main.js');
  await flush();
}

beforeEach(() => { h.calls.length = 0; h.listeners = {}; h.cached = null; try { localStorage.clear(); } catch (e) {} });
afterEach(() => { window.history.replaceState(null, '', '/'); });

describe('main.js bootstrap (#40)', () => {
  it('waits for auth, then each snapshot runs applySnapshot → writes on → save → resets → render', async () => {
    await boot();
    expect(h.calls).toContain('initAuth');
    expect(h.listeners.state).toBeTruthy();
    h.calls.length = 0;
    h.listeners.state.cb({ val: () => live });
    const order = ['applySnapshot', 'writes:true', 'cacheBanner:false', 'saveSnapshot', 'checkTaskResets', 'render', 'markSynced', 'handleFirstLoad'];
    const idx = order.map(c => h.calls.indexOf(c));
    expect(idx.every(i => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    const { state } = await import('../src/state.js');
    expect(Object.keys(state.tasks)).toEqual(['t1']);
  });

  it('handleFirstLoad runs only on the first snapshot', async () => {
    await boot();
    h.listeners.state.cb({ val: () => live });
    h.listeners.state.cb({ val: () => live });
    expect(h.calls.filter(c => c === 'handleFirstLoad')).toHaveLength(1);
  });

  it('a cached snapshot renders read-only before auth and the live listener', async () => {
    h.cached = live;
    await boot();
    const i = n => h.calls.indexOf(n);
    expect(i('writes:false')).toBeGreaterThanOrEqual(0);
    expect(i('writes:false')).toBeLessThan(i('applySnapshot'));
    expect(i('applySnapshot')).toBeLessThan(i('render'));
    expect(i('render')).toBeLessThan(i('initAuth'));
    expect(h.calls).toContain('cacheBanner:true');
    expect(h.calls).not.toContain('writes:true');
  });

  it('READONLY (?readonly=1): hides the PIN screen, marks the body, and never runs the login flow', async () => {
    await boot('?readonly=1');
    expect(document.getElementById('pin-screen').classList.contains('hidden')).toBe(true);
    expect(document.body.getAttribute('data-readonly')).toBe('1');
    expect(document.body.getAttribute('data-role')).toBe('member');
    expect(document.getElementById('readonly-banner').classList.contains('hidden')).toBe(false);
    h.listeners.state.cb({ val: () => live });
    expect(h.calls).toContain('render');
    expect(h.calls).not.toContain('handleFirstLoad');
  });
});

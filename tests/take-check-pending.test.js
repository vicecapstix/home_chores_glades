// #238: takeCheckPending is the atomic gate so only one parent's tap completes a check.
// Firebase SDK mocked; no live database.
import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), set: vi.fn(), remove: vi.fn(),
  update: vi.fn(), onValue: vi.fn(), runTransaction: vi.fn(),
}));

async function setup(readonly = false) {
  vi.resetModules();
  if (readonly) vi.doMock('../src/config.js', async () => ({ ...(await vi.importActual('../src/config.js')), READONLY: true }));
  else vi.doUnmock('../src/config.js');
  const { runTransaction } = await import('firebase/database');
  runTransaction.mockReset();
  const fb = await import('../src/firebase.js');
  fb.initFirebase();
  return { fb, rt: runTransaction };
}
const sdk = (rt, cur) => rt.mockImplementation(async (r, fn) => {
  const out = fn(cur);
  return { committed: out !== undefined, path: r };
});

describe('takeCheckPending (#238)', () => {
  it('returns the request and clears the node', async () => {
    const { fb, rt } = await setup();
    let wrote = 'unset';
    rt.mockImplementation(async (r, fn) => { expect(r).toBe('state/tasks/a/checkPending'); wrote = fn({ by: 'Bo', at: 5 }); return { committed: true }; });
    expect(await fb.takeCheckPending('a')).toEqual({ by: 'Bo', at: 5 });
    expect(wrote).toBeNull();
  });
  it('returns null when there is no request (already taken)', async () => {
    const { fb, rt } = await setup();
    sdk(rt, null);
    expect(await fb.takeCheckPending('a')).toBeNull();
  });
  it('throws a "connecting" error with code offline while showing cached data', async () => {
    const { fb, rt } = await setup();
    fb.setWritesEnabled(false);
    sdk(rt, { by: 'Bo', at: 5 });
    await expect(fb.takeCheckPending('a')).rejects.toMatchObject({ code: 'offline' });
    expect(rt).not.toHaveBeenCalled();
  });
  it('returns null without a transaction in READONLY (TV) mode', async () => {
    const { fb, rt } = await setup(true);
    sdk(rt, { by: 'Bo', at: 5 });
    expect(await fb.takeCheckPending('a')).toBeNull();
    expect(rt).not.toHaveBeenCalled();
  });
});

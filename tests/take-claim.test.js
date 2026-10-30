// #224: takeClaim is the single atomic gate that stops two approvers both awarding a claim.
// Firebase SDK is mocked; nothing touches a live database.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), set: vi.fn(), remove: vi.fn(),
  update: vi.fn(), onValue: vi.fn(), runTransaction: vi.fn(),
}));

// Simulates the SDK: runs the updater on the current value and commits unless it returns undefined.
async function setup(readonly = false) {
  vi.resetModules();
  if (readonly) vi.doMock('../src/config.js', async () => ({ ...(await vi.importActual('../src/config.js')), READONLY: true }));
  else vi.doUnmock('../src/config.js');
  const { runTransaction } = await import('firebase/database');
  runTransaction.mockReset();
  const fb = await import('../src/firebase.js');
  fb.initFirebase();
  return { fb, runTransaction };
}
const withValue = (rt, cur) => rt.mockImplementation(async (_r, fn) => ({ committed: fn(cur) !== undefined }));

describe('takeClaim (#224)', () => {
  let fb, rt;
  beforeEach(async () => { ({ fb, runTransaction: rt } = await setup()); });

  it('commits (true) and removes the node when the claim exists', async () => {
    let written = 'unset';
    rt.mockImplementation(async (r, fn) => { written = fn({ id: 'c1', points: 5 }); expect(r).toBe('state/claims/c1'); return { committed: written !== undefined }; });
    expect(await fb.takeClaim('c1')).toBe(true);
    expect(written).toBeNull();
  });

  it('returns false and writes nothing when the claim is already taken', async () => {
    withValue(rt, null);
    expect(await fb.takeClaim('c1')).toBe(false);
  });

  it('returns false without a transaction while showing cached data (writes disabled)', async () => {
    fb.setWritesEnabled(false);
    withValue(rt, { id: 'c1' });
    expect(await fb.takeClaim('c1')).toBe(false);
    expect(rt).not.toHaveBeenCalled();
  });

  it('returns false without a transaction in READONLY (TV) mode', async () => {
    const r = await setup(true);
    withValue(r.runTransaction, { id: 'c1' });
    expect(await r.fb.takeClaim('c1')).toBe(false);
    expect(r.runTransaction).not.toHaveBeenCalled();
  });
});

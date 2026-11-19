import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), set: vi.fn(),
  remove: vi.fn(), update: vi.fn(), onValue: vi.fn(), runTransaction: vi.fn(),
}));

let fb, runTransaction, paths;
// runs the transaction callback against `cur` and records the path
function tx(cur) {
  runTransaction.mockImplementation(async (r, fn) => { paths.push(String(r)); const out = fn(cur); return { committed: out !== undefined, out }; });
}
beforeEach(async () => {
  vi.resetModules(); paths = [];
  ({ runTransaction } = await import('firebase/database'));
  runTransaction.mockReset();
  fb = await import('../src/firebase.js');
  fb.initFirebase();
  fb.setWritesEnabled(true);
});

describe('reserveStock (#357)', () => {
  it('takes one copy on rewards/<id>/stock', async () => {
    let seen; runTransaction.mockImplementation(async (r, fn) => { paths.push(String(r)); seen = fn(3); return { committed: true }; });
    expect(await fb.reserveStock('r1')).toBe(true);
    expect(paths).toEqual(['state/rewards/r1/stock']);
    expect(seen).toBe(2);
  });
  it('reports sold out at 0 and changes nothing', async () => {
    let seen = 'unset'; runTransaction.mockImplementation(async (_r, fn) => { seen = fn(0); return { committed: false }; });
    expect(await fb.reserveStock('r1')).toBe(false);
    expect(seen).toBeUndefined();
  });
  it('leaves an unlimited reward (no stock) alone', async () => {
    let seen = 'unset'; runTransaction.mockImplementation(async (_r, fn) => { seen = fn(null); return { committed: false }; });
    expect(await fb.reserveStock('r1')).toBe(true);
    expect(seen).toBeUndefined();
  });
  it('not live (cached start): no transaction and not reported as sold out', async () => {
    fb.setWritesEnabled(false);
    expect(await fb.reserveStock('r1')).toBe(true);
    expect(runTransaction).not.toHaveBeenCalled();
  });
});

describe('releaseStock (#357)', () => {
  it('gives one copy back, capped at 99', async () => {
    const seen = []; runTransaction.mockImplementation(async (_r, fn) => { seen.push(fn(3), fn(99)); return { committed: true }; });
    await fb.releaseStock('r1');
    expect(seen).toEqual([4, 99]);
  });
  it('leaves an unlimited reward alone and does nothing when not live', async () => {
    let seen = 'unset'; runTransaction.mockImplementation(async (_r, fn) => { seen = fn(null); return { committed: false }; });
    await fb.releaseStock('r1');
    expect(seen).toBeUndefined();
    runTransaction.mockClear(); fb.setWritesEnabled(false);
    await fb.releaseStock('r1');
    expect(runTransaction).not.toHaveBeenCalled();
  });
});

describe('takePendingRedemption (#357)', () => {
  it('removes only a still-pending request', async () => {
    const seen = []; runTransaction.mockImplementation(async (r, fn) => { paths.push(String(r)); seen.push(fn({ status: 'pending' }), fn({ status: 'denied' }), fn(null)); return { committed: true }; });
    expect(await fb.takePendingRedemption('rd1')).toBe(true);
    expect(paths).toEqual(['state/redemptions/rd1']);
    expect(seen).toEqual([null, undefined, undefined]);
  });
  it('returns false when not committed or not live', async () => {
    tx(undefined);
    expect(await fb.takePendingRedemption('rd1')).toBe(false);
    fb.setWritesEnabled(false);
    runTransaction.mockClear();
    expect(await fb.takePendingRedemption('rd1')).toBe(false);
    expect(runTransaction).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory fake RTDB. runTransaction can simulate a concurrent writer that
// changes the live value between our read and commit (updater re-runs).
const db = {};
let racer = null;
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), onValue: vi.fn(), remove: vi.fn(),
  set: vi.fn(), update: vi.fn(),
  runTransaction: vi.fn(async (p, fn) => {
    if (racer) { fn(db[p] ?? null); const r = racer; racer = null; r(); } // stale first attempt
    const next = fn(db[p] ?? null);
    if (next === undefined) return { committed: false };
    db[p] = next; return { committed: true };
  }),
}));

let fb;
beforeEach(async () => {
  vi.resetModules();
  Object.keys(db).forEach(k => delete db[k]); racer = null;
  fb = await import('../src/firebase.js');
  fb.initFirebase();
});
const e = n => ({ taskId: 't' + n, taskName: 'n' + n, person: 'A', completedAt: n, points: 1 });

describe('appendHistory (#31)', () => {
  it('appends in order to an empty history', async () => {
    await fb.appendHistory(e(1)); await fb.appendHistory(e(2));
    expect(db['state/history'].map(h => h.completedAt)).toEqual([1, 2]);
  });
  it('caps at 500, dropping the oldest', async () => {
    db['state/history'] = Array.from({ length: 500 }, (_, i) => e(i + 1));
    await fb.appendHistory(e(501));
    const h = db['state/history'];
    expect(h).toHaveLength(500);
    expect(h[0].completedAt).toBe(2);
    expect(h[499].completedAt).toBe(501);
  });
  it('does not lose a concurrent writer entry', async () => {
    db['state/history'] = [e(1)];
    racer = () => { db['state/history'] = [e(1), e(2)]; };
    await fb.appendHistory(e(3));
    expect(db['state/history'].map(h => h.completedAt)).toEqual([1, 2, 3]);
  });
  it('tolerates object-shaped server data', async () => {
    db['state/history'] = { 0: e(1), 1: e(2) };
    await fb.appendHistory(e(3));
    expect(db['state/history']).toHaveLength(3);
  });
});

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

describe('renameHistoryPerson (#274)', () => {
  it('renames person, by and checkedBy by name and leaves others alone', async () => {
    db['state/history'] = [{ person: 'Bo', completedAt: 1 }, { by: 'Bo', person: 'Ann', completedAt: 2 }, { person: 'Ann', checkedBy: 'Bo', completedAt: 3 }, { person: 'Cy', completedAt: 4 }];
    await fb.renameHistoryPerson('Bo', 'Bobby');
    expect(db['state/history']).toEqual([{ person: 'Bobby', completedAt: 1 }, { by: 'Bobby', person: 'Ann', completedAt: 2 }, { person: 'Ann', checkedBy: 'Bobby', completedAt: 3 }, { person: 'Cy', completedAt: 4 }]);
  });
  it('a concurrent append during the transaction is kept and the right entries renamed', async () => {
    db['state/history'] = [{ person: 'Bo', completedAt: 1 }];
    racer = () => { db['state/history'] = [{ person: 'Ann', completedAt: 0 }, { person: 'Bo', completedAt: 1 }, { person: 'Bo', completedAt: 2 }]; };
    await fb.renameHistoryPerson('Bo', 'Bobby');
    expect(db['state/history'].map(h => h.person)).toEqual(['Ann', 'Bobby', 'Bobby']);
  });
  it('does nothing on an empty history', async () => {
    await fb.renameHistoryPerson('Bo', 'Bobby');
    expect(db['state/history'] ?? null).toBeNull();
  });
});

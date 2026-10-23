import { describe, it, expect, vi, beforeEach } from 'vitest';

// #183 — removeHistoryEntry runs on the LIVE history array (in-memory fake RTDB).
const db = {};
let racer = null;
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), onValue: vi.fn(), remove: vi.fn(),
  set: vi.fn(), update: vi.fn(),
  runTransaction: vi.fn(async (p, fn) => {
    if (racer) { fn(db[p] ?? null); const r = racer; racer = null; r(); }
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
const chore = (n, who = 'A') => ({ taskId: 't' + n, taskName: 'n' + n, person: who, completedAt: n, points: 1 });
const bonus = (n, who = 'A') => ({ type: 'bonus', taskName: 'Bonus: r', reason: 'r', person: who, points: 5, completedAt: n });

describe('removeHistoryEntry (#183)', () => {
  it('removes only the matching chore entry', async () => {
    db['state/history'] = [chore(1), chore(2), chore(3)];
    const r = await fb.removeHistoryEntry({ taskId: 't2', completedAt: 2, person: 'A' });
    expect(r.removed).toBe(true);
    expect(db['state/history'].map(h => h.completedAt)).toEqual([1, 3]);
    expect(r.rest.map(h => h.completedAt)).toEqual([1, 3]);
  });
  it('keeps an entry another device appended meanwhile', async () => {
    db['state/history'] = [chore(1), chore(2)];
    racer = () => { db['state/history'] = [chore(1), chore(2), chore(9, 'B')]; };
    await fb.removeHistoryEntry({ taskId: 't2', completedAt: 2, person: 'A' });
    expect(db['state/history'].map(h => h.completedAt)).toEqual([1, 9]);
  });
  it('matches a bonus by type, person and completedAt only', async () => {
    db['state/history'] = [chore(5), bonus(5), bonus(5, 'B')];
    await fb.removeHistoryEntry({ type: 'bonus', completedAt: 5, person: 'A' });
    expect(db['state/history']).toEqual([chore(5), bonus(5, 'B')]);
  });
  it('does not write when the entry is not on the live array', async () => {
    db['state/history'] = [chore(1)];
    const r = await fb.removeHistoryEntry({ taskId: 'tX', completedAt: 7, person: 'A' });
    expect(r.removed).toBe(false);
    expect(db['state/history']).toEqual([chore(1)]);
  });
  it('tolerates object-shaped server data', async () => {
    db['state/history'] = { 0: chore(1), 1: chore(2) };
    await fb.removeHistoryEntry({ taskId: 't1', completedAt: 1, person: 'A' });
    expect(db['state/history'].map(h => h.completedAt)).toEqual([2]);
  });
});

describe('history cap lives in one place (#183)', () => {
  it('HISTORY_CAP is 500 and appendHistory uses it', async () => {
    const { HISTORY_CAP } = await import('../src/config.js');
    expect(HISTORY_CAP).toBe(500);
    db['state/history'] = Array.from({ length: HISTORY_CAP }, (_, i) => chore(i + 1));
    await fb.appendHistory(chore(HISTORY_CAP + 1));
    expect(db['state/history']).toHaveLength(HISTORY_CAP);
  });
});

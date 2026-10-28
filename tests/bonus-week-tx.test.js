import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// #221 review: run the REAL adjustMemberPoints transaction (src/firebase.js) on an in-memory fake RTDB.
const db = {};
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), onValue: vi.fn(), remove: vi.fn(),
  set: vi.fn(), update: vi.fn(),
  runTransaction: vi.fn(async (p, fn) => {
    const next = fn(db[p] ?? null);
    if (next === undefined) return { committed: false, snapshot: { val: () => db[p] ?? null } };
    db[p] = next; return { committed: true, snapshot: { val: () => next } };
  }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));

const NOW = new Date('2026-05-13T12:00:00').getTime(); // week starts Mon 2026-05-11
const WEEK = '2026-05-11';
const admin = () => true;
const asDad = () => 'Dad';
let fb, bonus, undo, state;

beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  Object.keys(db).forEach(k => delete db[k]);
  fb = await import('../src/firebase.js');
  fb.initFirebase();
  fb.setWritesEnabled(true);
  bonus = await import('../src/bonus.js');
  undo = await import('../src/undo.js');
  ({ state } = await import('../src/state.js'));
  state.history = [];
});
afterEach(() => vi.useRealTimers());

const alice = (weekPoints, points = 20) => {
  db['state/members/Alice'] = { name: 'Alice', role: 'member', points, weekPoints, weekStart: WEEK };
  state.members = { Alice: { ...db['state/members/Alice'] }, Dad: { name: 'Dad', role: 'admin', points: 0 } };
};

describe('real adjustMemberPoints keeps week points at 0 or above (#221)', () => {
  it('−15 on 10 week points leaves weekPoints 0', async () => {
    alice(10);
    const r = await fb.adjustMemberPoints('Alice', { pts: -15, count: 0, weekStart: WEEK, allowNegative: true });
    expect(r.ok).toBe(true);
    expect(db['state/members/Alice'].weekPoints).toBe(0);
    expect(db['state/members/Alice'].points).toBe(5);
  });
});

describe('undoing a deduction gives back only what the week lost (#221 review)', () => {
  it('−5 on 3 week points, then undo → week back to 3, total back to 20', async () => {
    alice(3);
    expect(await bonus.adjustBonus('Alice', -5, 'Broke a plate', admin, asDad)).toBe(true);
    expect(db['state/members/Alice'].weekPoints).toBe(0);
    await undo.pushUndo.mock.calls[0][0].undo();
    expect(db['state/members/Alice'].weekPoints).toBe(3);
    expect(db['state/members/Alice'].points).toBe(20);
  });

  it('undoing a +5 award still takes the 5 back off the week', async () => {
    alice(3);
    await bonus.adjustBonus('Alice', 5, 'Helped Grandma', admin, asDad);
    expect(db['state/members/Alice'].weekPoints).toBe(8);
    await undo.pushUndo.mock.calls[0][0].undo();
    expect(db['state/members/Alice'].weekPoints).toBe(3);
    expect(db['state/members/Alice'].points).toBe(20);
  });
});

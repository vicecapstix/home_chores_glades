import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory fake RTDB for spend/refund transactions
const db = {};
const get = p => p.split('/').reduce((o, k) => (o == null ? o : o[k]), db);
const put = (p, v) => {
  const ks = p.split('/'); const last = ks.pop();
  const parent = ks.reduce((o, k) => (o[k] = o[k] || {}), db);
  if (v === null || v === undefined) delete parent[last]; else parent[last] = v;
};
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), onValue: vi.fn(), remove: vi.fn(),
  set: vi.fn(async (p, v) => put(p, v)),
  update: vi.fn(async (p, f) => { Object.entries(f).forEach(([k, v]) => put(p + '/' + k, v)); }),
  runTransaction: vi.fn(async (p, fn) => {
    const next = fn(get(p) ?? null);
    if (next === undefined) return { committed: false };
    put(p, next); return { committed: true };
  }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));

let fb, pm, state;
beforeEach(async () => {
  vi.resetModules();
  Object.keys(db).forEach(k => delete db[k]);
  state = (await import('../src/state.js')).state;
  fb = await import('../src/firebase.js');
  pm = await import('../src/pocketmoney.js');
  fb.initFirebase();
  state.pocketMoney = { pts: 10, amount: 1 };
  state.members = { Kid: { name: 'Kid', role: 'member', points: 0 }, Mum: { name: 'Mum', role: 'admin', points: 0 } };
});

const kid = (over = {}) => ({ name: 'Kid', role: 'member', points: 0, ...over });

describe('owed ignores reward spends (#347)', () => {
  it('payout at 100, spend 80, earn 30 -> 30 owed', () => {
    const m = kid({ points: 50, spent: 80, payouts: { p1: { at: 1, points: 100, earned: 100 } } });
    expect(pm.owed(m).pts).toBe(30);
    expect(pm.owed(m).cents).toBe(300);
  });
  it('a refunded reward (spent back to 0) changes nothing', () => {
    const m = kid({ points: 130, spent: 0, payouts: { p1: { at: 1, points: 100, earned: 100 } } });
    expect(pm.owed(m).pts).toBe(30);
  });
  it('bonus deductions still lower owed, never below 0', () => {
    const p = { p1: { at: 1, points: 100, earned: 100 } };
    expect(pm.owed(kid({ points: 110, spent: 0, payouts: p })).pts).toBe(10);
    expect(pm.owed(kid({ points: 80, spent: 0, payouts: p })).pts).toBe(0);
  });
  it('old payouts without earned keep the old formula; no payouts counts everything earned', () => {
    expect(pm.owed(kid({ points: 150, payouts: { p1: { at: 1, points: 100 } } })).pts).toBe(50);
    expect(pm.owed(kid({ points: 20, spent: 30 })).pts).toBe(50);
  });
});

describe('markPaid and spend/refund bookkeeping (#347)', () => {
  it('markPaid stores earned = points + spent next to points', async () => {
    state.members.Kid.points = 20; state.members.Kid.spent = 80;
    const patchPaths = vi.spyOn(fb, 'patchPaths').mockResolvedValue(undefined);
    await pm.markPaid('Kid', () => true, () => 'Mum');
    patchPaths.mockRestore();
    const entry = Object.values(db.state?.members?.Kid?.payouts || state.members.Kid.payouts)[0];
    expect(entry.points).toBe(20);
    expect(entry.earned).toBe(100);
  });
  it('spendPoints adds to spent, refundPoints takes it back (floor 0)', async () => {
    db.state = { members: { Kid: { points: 100 } } };
    expect(await fb.spendPoints('Kid', 80)).toBe(true);
    expect(db.state.members.Kid).toMatchObject({ points: 20, spent: 80 });
    await fb.refundPoints('Kid', 80);
    expect(db.state.members.Kid).toMatchObject({ points: 100, spent: 0 });
    await fb.refundPoints('Kid', 5);
    expect(db.state.members.Kid.spent).toBe(0);
  });
  it('a refused spend (not enough points) leaves spent alone', async () => {
    db.state = { members: { Kid: { points: 10 } } };
    expect(await fb.spendPoints('Kid', 80)).toBe(false);
    expect(db.state.members.Kid.spent).toBeUndefined();
  });
});

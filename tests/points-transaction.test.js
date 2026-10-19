import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// In-memory fake RTDB: runTransaction applies the updater to the *live* store.
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

let fb, state, toggleTask, showToast;
const admin = () => true, notAdmin = () => false;
const sync = () => {
  state.members = JSON.parse(JSON.stringify(db.state.members));
  state.tasks = JSON.parse(JSON.stringify(db.state.tasks));
};

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-13T12:00:00')); // Wed; week starts 2026-05-11
  Object.keys(db).forEach(k => delete db[k]);
  state = (await import('../src/state.js')).state;
  fb = await import('../src/firebase.js');
  fb.initFirebase();
  ({ toggleTask } = await import('../src/tasks.js'));
  ({ showToast } = await import('../src/ui.js'));
  db.state = {
    members: { Alice: { name: 'Alice', role: 'member', points: 0, weekPoints: 0, weekStart: '2026-05-11', completedCount: 0, streak: 0, badges: [] } },
    tasks: { t1: { id: 't1', name: 'Mop', freq: 'monthly', difficulty: 'hard', done: false, lastDone: 0, person: 'Alice' } }, // 24 pts
    history: [], nextId: 5,
  };
  sync(); state.history = [];
});
afterEach(() => vi.useRealTimers());

describe('uncheck after spending (#103)', () => {
  it('check -> spend -> uncheck: member refused, admin goes negative', async () => {
    await toggleTask('t1', () => 'Alice', notAdmin); sync();
    expect(db.state.members.Alice.points).toBe(24);
    expect(await fb.spendPoints('Alice', 24)).toBe(true); sync();
    await toggleTask('t1', () => 'Alice', notAdmin); sync();
    expect(db.state.tasks.t1.done).toBe(true);
    expect(db.state.members.Alice.points).toBe(0);
    expect(showToast).toHaveBeenCalledWith('Points already spent — ask a parent');
    await toggleTask('t1', () => 'Parent', admin); sync();
    expect(db.state.tasks.t1.done).toBe(false);
    expect(db.state.members.Alice.points).toBe(-24);
  });

  it('a spend from another device is not overwritten by a stale cache', async () => {
    await toggleTask('t1', () => 'Alice', notAdmin); sync();
    await fb.spendPoints('Alice', 10); // other device; local cache still says 24
    await toggleTask('t1', () => 'Parent', admin);
    expect(db.state.members.Alice.points).toBe(-10);
  });

  it("records lastDoneWeek and leaves this week alone when unchecking last week's tick", async () => {
    await toggleTask('t1', () => 'Alice', notAdmin);
    expect(db.state.tasks.t1.lastDoneWeek).toBe('2026-05-11');
    // Time moves to next week; Alice earns 5 this week elsewhere.
    vi.setSystemTime(new Date('2026-05-20T12:00:00'));
    Object.assign(db.state.members.Alice, { points: 29, weekPoints: 5, weekStart: '2026-05-18' });
    sync();
    await toggleTask('t1', () => 'Parent', admin);
    expect(db.state.members.Alice.points).toBe(5);
    expect(db.state.members.Alice.weekPoints).toBe(5);
    expect(db.state.members.Alice.weekStart).toBe('2026-05-18');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const set = vi.fn().mockResolvedValue(undefined);
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), set: (...a) => set(...a),
  remove: vi.fn(), update: vi.fn(), onValue: vi.fn(), runTransaction: vi.fn(),
}));

let fb, state;
beforeEach(async () => {
  vi.resetModules(); set.mockClear();
  state = (await import('../src/state.js')).state;
  fb = await import('../src/firebase.js');
  fb.initFirebase();
  Object.assign(state, { members: {}, tasks: {}, history: [], nextId: 3, templates: {}, rewards: {}, redemptions: {} });
});

describe('writeState carries the rewards node (a full write must not wipe the catalog)', () => {
  it('includes rewards when present', async () => {
    state.rewards = { r1: { id: 'r1', name: 'Pizza', cost: 10, icon: '🍕' } };
    await fb.writeState();
    expect(set.mock.calls[0][0]).toBe('state');
    expect(set.mock.calls[0][1].rewards).toEqual(state.rewards);
  });
  it('writes null (omits) when the catalog is empty', async () => {
    await fb.writeState();
    expect(set.mock.calls[0][1].rewards).toBeNull();
  });
});

describe('redemptions and atomic points', () => {
  it('writeState carries redemptions through', async () => {
    state.redemptions = { a: { id: 'a' } };
    await fb.writeState();
    expect(set.mock.calls[0][1].redemptions).toEqual({ a: { id: 'a' } });
  });
  it('spendPoints transaction aborts below cost and subtracts otherwise', async () => {
    const { runTransaction } = await import('firebase/database');
    runTransaction.mockImplementation(async (_r, fn) => ({ committed: fn(10) !== undefined }));
    expect(await fb.spendPoints('Al', 20)).toBe(false);
    expect(await fb.spendPoints('Al', 10)).toBe(true);
    let seen;
    runTransaction.mockImplementation(async (_r, fn) => { seen = fn(10); return { committed: true }; });
    await fb.spendPoints('Al', 4);
    expect(seen).toBe(6);
    await fb.refundPoints('Al', 4);
    expect(seen).toBe(14);
  });
});

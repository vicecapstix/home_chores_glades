import { describe, it, expect, vi, beforeEach } from 'vitest';

const set = vi.fn().mockResolvedValue(undefined);
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), set: (...a) => set(...a),
  remove: vi.fn(), update: vi.fn(), onValue: vi.fn(),
}));

let fb, state;
beforeEach(async () => {
  vi.resetModules(); set.mockClear();
  state = (await import('../src/state.js')).state;
  fb = await import('../src/firebase.js');
  fb.initFirebase();
  Object.assign(state, { members: {}, tasks: {}, history: [], nextId: 3, templates: {}, rewards: {} });
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

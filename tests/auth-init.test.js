import { describe, it, expect, vi, beforeEach } from 'vitest';

const signIn = vi.fn();
let cb;
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  signInAnonymously: (...a) => signIn(...a),
  onAuthStateChanged: (_a, fn) => { cb = fn; fn(null); },
}));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn(), set: vi.fn(), remove: vi.fn(), update: vi.fn(), onValue: vi.fn(), runTransaction: vi.fn(),
}));

let fb;
beforeEach(async () => {
  vi.resetModules(); signIn.mockReset();
  fb = await import('../src/firebase.js');
  fb.initFirebase();
});

describe('initAuth reports its outcome (#41)', () => {
  it('ok:true when anonymous sign-in works', async () => {
    signIn.mockResolvedValue({ user: { uid: 'u' } });
    expect((await fb.initAuth()).ok).toBe(true);
  });
  it('ok:false with the error code when sign-in is not enabled', async () => {
    signIn.mockRejectedValue(Object.assign(new Error('nope'), { code: 'auth/operation-not-allowed' }));
    const res = await fb.initAuth();
    expect(res.ok).toBe(false);
    expect(res.code).toBe('auth/operation-not-allowed');
  });
});

describe('describeAuthFailure', () => {
  it('tells the admin to enable Anonymous sign-in', async () => {
    const msg = fb.describeAuthFailure({ ok: false, code: 'auth/operation-not-allowed' });
    expect(msg).toMatch(/anonymous/i);
    expect(msg).toMatch(/Firebase Console/);
  });
  it('returns "" when sign-in worked', () => {
    expect(fb.describeAuthFailure({ ok: true })).toBe('');
  });
});

import { describe, it, expect, vi } from 'vitest';
const signInEmail = vi.fn();
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({})), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn(), signInWithEmailAndPassword: (...a) => signInEmail(...a), signOut: vi.fn() }));
vi.mock('firebase/database', () => ({ getDatabase: vi.fn(), ref: vi.fn(), set: vi.fn(), remove: vi.fn(), update: vi.fn(), onValue: vi.fn(), runTransaction: vi.fn() }));
vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), READONLY: true }));

describe('READONLY (TV) view', () => {
  it('cannot parent sign in or out', async () => {
    const fb = await import('../src/firebase.js');
    expect((await fb.parentSignIn('a@b.c', 'pw')).ok).toBe(false);
    expect((await fb.parentSignOut()).ok).toBe(false);
    expect(signInEmail).not.toHaveBeenCalled();
  });
});

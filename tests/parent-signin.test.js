import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

// ── isAdmin with and without /admins (#97) ────────────────────────────────────
describe('isAdmin with /admins', () => {
  let st, auth;
  beforeEach(async () => {
    vi.resetModules();
    sessionStorage.clear();
    st = (await import('../src/state.js')).state;
    auth = await import('../src/auth.js');
    st.members = {
      JT:  { name: 'JT',  role: 'admin' },
      Kid: { name: 'Kid', role: 'member' },
    };
  });

  it('falls back to member roles while /admins is empty', () => {
    sessionStorage.setItem('fc_member', 'JT');
    expect(auth.isAdmin()).toBe(true);
    sessionStorage.setItem('fc_member', 'Kid');
    expect(auth.isAdmin()).toBe(false);
  });

  it('keeps setup mode (zero members) while /admins is empty', () => {
    st.members = {};
    expect(auth.isAdmin()).toBe(true);
  });

  it('once /admins exists, a role:admin member without a listed UID is not admin', () => {
    st.admins = { 'uid-jt': 'JT' };
    st.auth = { uid: 'anon-uid', isParent: false, email: '' };
    sessionStorage.setItem('fc_member', 'JT');
    expect(auth.isAdmin()).toBe(false);
  });

  it('once /admins exists, the signed-in listed UID is admin', () => {
    st.admins = { 'uid-jt': 'JT' };
    st.auth = { uid: 'uid-jt', isParent: true, email: 'p@example.com' };
    expect(auth.isAdmin()).toBe(true);
    expect(auth.parentMemberName()).toBe('JT');
  });

  it('once /admins exists, setup mode no longer makes everyone admin', () => {
    st.members = {};
    st.admins = { 'uid-jt': 'JT' };
    expect(auth.isAdmin()).toBe(false);
  });
});

// ── Parent sign-in helpers with mocked Firebase Auth ─────────────────────────
const signInEmail = vi.fn();
const signOutFn = vi.fn();
vi.mock('firebase/app', () => ({ initializeApp: vi.fn((opts) => ({ opts })) }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  signInAnonymously: vi.fn(() => Promise.resolve({ user: { uid: 'anon' } })),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: (...a) => signInEmail(...a),
  signOut: (...a) => signOutFn(...a),
}));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn(), set: vi.fn(), remove: vi.fn(), update: vi.fn(), onValue: vi.fn(), runTransaction: vi.fn(),
}));

describe('parentSignIn / parentSignOut', () => {
  let fb;
  beforeEach(async () => {
    vi.resetModules(); signInEmail.mockReset(); signOutFn.mockReset();
    fb = await import('../src/firebase.js');
    fb.initFirebase();
  });

  it('returns the uid on success and trims the email', async () => {
    signInEmail.mockResolvedValue({ user: { uid: 'uid-jt' } });
    const res = await fb.parentSignIn('  p@example.com ', 'pw');
    expect(res).toEqual({ ok: true, uid: 'uid-jt' });
    expect(signInEmail.mock.calls[0][1]).toBe('p@example.com');
  });

  it('returns the error code on failure (never throws)', async () => {
    signInEmail.mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/invalid-credential' }));
    expect(await fb.parentSignIn('p@example.com', 'bad')).toEqual({ ok: false, code: 'auth/invalid-credential' });
  });

  it('sign out reports failures instead of throwing', async () => {
    signOutFn.mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/network-request-failed' }));
    expect(await fb.parentSignOut()).toEqual({ ok: false, code: 'auth/network-request-failed' });
  });

  it('maps sign-in error codes to friendly messages', () => {
    expect(fb.describeParentSignInError('auth/invalid-credential')).toBe('Wrong email or password');
    expect(fb.describeParentSignInError('auth/wrong-password')).toBe('Wrong email or password');
    expect(fb.describeParentSignInError('auth/too-many-requests')).toMatch(/Too many attempts/);
    expect(fb.describeParentSignInError('auth/operation-not-allowed')).toMatch(/Email\/Password/);
    expect(fb.describeParentSignInError('auth/invalid-api-key')).toMatch(/FB_API_KEY/);
    expect(fb.describeParentSignInError('auth/weird')).toMatch(/auth\/weird/);
  });
});

describe('parent sign-in wiring', () => {
  const html = readFileSync('src/index.html', 'utf8');
  const main = readFileSync('src/main.js', 'utf8');
  it('login screen has an email + password form that starts hidden', () => {
    expect(html).toMatch(/<form id="parent-signin" class="hidden"/);
    expect(html).toMatch(/id="parent-email" type="email"/);
    expect(html).toMatch(/id="parent-password" type="password"/);
  });
  it('switching user signs the parent out', () => {
    expect(main).toMatch(/window\.switchUser\s*=\s*\(\)\s*=>\s*\{\s*signOutParent\(\);/);
  });
  it('rules make /admins readable when signed in and never client-writable', () => {
    const rules = JSON.parse(readFileSync('firebase-rules.json', 'utf8')).rules;
    expect(rules.admins['.read']).toBe('auth != null');
    expect(rules.admins['.write']).toBe(false);
  });
});

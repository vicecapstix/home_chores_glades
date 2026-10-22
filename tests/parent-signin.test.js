import { describe, it, expect, vi, beforeEach } from 'vitest';

const signInEmail = vi.fn();
const signOutFn = vi.fn();
const signAnon = vi.fn();
let authCb;
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  signInAnonymously: (...a) => signAnon(...a),
  signInWithEmailAndPassword: (...a) => signInEmail(...a),
  signOut: (...a) => signOutFn(...a),
  onAuthStateChanged: (_a, fn) => { authCb = fn; },
}));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn(), set: vi.fn(), remove: vi.fn(), update: vi.fn(), onValue: vi.fn(), runTransaction: vi.fn(),
}));

let fb, auth, st;
beforeEach(async () => {
  vi.resetModules();
  signInEmail.mockReset(); signOutFn.mockReset(); signAnon.mockReset();
  sessionStorage.clear();
  fb = await import('../src/firebase.js');
  auth = await import('../src/auth.js');
  st = (await import('../src/state.js')).state;
  fb.initFirebase();
});

function members() {
  st.members = {
    Mum: { name: 'Mum', role: 'admin' },
    Kid: { name: 'Kid', role: 'admin' }, // role says admin but is not a parent account
  };
}

describe('isAdmin with and without /admins (#97)', () => {
  it('falls back to the role field when /admins is missing', () => {
    members(); st.admins = null; st.uid = 'u1';
    sessionStorage.setItem('fc_member', 'Mum');
    expect(auth.isAdmin()).toBe(true);
    sessionStorage.setItem('fc_member', 'Kid');
    expect(auth.isAdmin()).toBe(true);
  });
  it('falls back to the role field when /admins is empty', () => {
    members(); st.admins = {}; st.uid = 'u1';
    sessionStorage.setItem('fc_member', 'Mum');
    expect(auth.isAdmin()).toBe(true);
  });
  it('uses the signed-in UID once /admins exists, ignoring role', () => {
    members(); st.admins = { parentUid: 'Mum' };
    sessionStorage.setItem('fc_member', 'Kid');
    st.uid = 'anonUid';
    expect(auth.isAdmin()).toBe(false);
    st.uid = 'parentUid';
    expect(auth.isAdmin()).toBe(true);
  });
  it('a listed UID is admin even before picking a member', () => {
    members(); st.admins = { parentUid: 'Mum' }; st.uid = 'parentUid';
    expect(auth.isAdmin()).toBe(true);
  });
  it('signed-out (no uid) is not admin once /admins exists', () => {
    members(); st.admins = { parentUid: 'Mum' }; st.uid = null;
    sessionStorage.setItem('fc_member', 'Mum');
    expect(auth.isAdmin()).toBe(false);
  });
  it('setup mode (no members) is still admin', () => {
    st.members = {}; st.admins = { parentUid: 'Mum' }; st.uid = 'x';
    expect(auth.isAdmin()).toBe(true);
  });
});

describe('completeParentLogin', () => {
  it('adopts the member named in /admins', () => {
    document.body.innerHTML = '<div id="pin-screen"></div>';
    members(); st.admins = { p: 'Mum' }; st.uid = 'p';
    window._fcLoginCallback = vi.fn();
    auth.completeParentLogin();
    expect(sessionStorage.getItem('fc_member')).toBe('Mum');
    expect(window._fcLoginCallback).toHaveBeenCalled();
  });
  it('still closes login when the name is unknown', () => {
    document.body.innerHTML = '<div id="pin-screen"></div>';
    members(); st.admins = { p: 'Nobody' }; st.uid = 'p';
    window._fcLoginCallback = vi.fn();
    auth.completeParentLogin();
    expect(sessionStorage.getItem('fc_member')).toBeNull();
    expect(window._fcLoginCallback).toHaveBeenCalled();
  });
});

describe('parentSignIn / parentSignOut', () => {
  it('signs in with email and password', async () => {
    signInEmail.mockResolvedValue({});
    expect((await fb.parentSignIn(' a@b.c ', 'pw')).ok).toBe(true);
    expect(signInEmail.mock.calls[0][1]).toBe('a@b.c');
    expect(signInEmail.mock.calls[0][2]).toBe('pw');
  });
  it('rejects empty fields without calling Auth', async () => {
    const r = await fb.parentSignIn('', '');
    expect(r.ok).toBe(false);
    expect(signInEmail).not.toHaveBeenCalled();
  });
  it.each([
    ['auth/wrong-password', /email and password/],
    ['auth/invalid-credential', /email and password/],
    ['auth/operation-not-allowed', /Email\/Password/],
    ['auth/network-request-failed', /Network/],
    ['auth/too-many-requests', /Too many/],
    ['auth/invalid-email', /email/],
  ])('maps %s to a friendly message', async (code, re) => {
    signInEmail.mockRejectedValue(Object.assign(new Error('x'), { code }));
    const r = await fb.parentSignIn('a@b.c', 'pw');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(re);
  });
  it('never exposes the password in the error', async () => {
    signInEmail.mockRejectedValue(new Error('boom pw123'));
    const r = await fb.parentSignIn('a@b.c', 'pw123');
    expect(r.message).not.toMatch(/pw123/);
  });
  it('sign out calls Auth and reports failure gently', async () => {
    signOutFn.mockResolvedValue();
    expect((await fb.parentSignOut()).ok).toBe(true);
    signOutFn.mockRejectedValue(new Error('x'));
    expect((await fb.parentSignOut()).ok).toBe(false);
  });
  it('auth changes update state.uid and notify the app; signed out falls back to anonymous', async () => {
    const changed = vi.fn();
    fb.setAuthChangeHandler(changed);
    signAnon.mockResolvedValue({});
    const p = fb.initAuth();
    authCb({ uid: 'p1', email: 'a@b.c' });
    expect((await p).ok).toBe(true);
    expect(st.uid).toBe('p1');
    expect(st.parentEmail).toBe(true);
    authCb(null);
    expect(st.uid).toBeNull();
    expect(signAnon).toHaveBeenCalled();
    expect(changed).toHaveBeenCalledTimes(2);
  });
});

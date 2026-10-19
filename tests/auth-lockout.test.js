import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let auth, st, sha256, now;

function dom() {
  document.body.innerHTML = `<div id="pin-screen"><div id="pin-member-sub"></div><div id="pin-member-name"></div>
    <div id="pin-member-pin" class="hidden"><div id="pin-member-dots"><span class="pin-dot"></span><span class="pin-dot"></span><span class="pin-dot"></span><span class="pin-dot"></span></div>
    <div id="pin-member-error"></div></div><div id="pin-member-chips"></div></div>`;
}
async function enter(pin) { for (const d of pin) await auth.memberPinKey(d); }
const err = () => document.getElementById('pin-member-error').textContent;

beforeEach(async () => {
  vi.resetModules(); dom(); sessionStorage.clear(); localStorage.clear();
  now = 1_700_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  st = (await import('../src/state.js')).state;
  ({ sha256 } = await import('../src/utils.js'));
  st.members = {
    Ann: { name: 'Ann', role: 'member', pinHash: await sha256('1234') },
    Bob: { name: 'Bob', role: 'member', pinHash: await sha256('4321') },
  };
  auth = await import('../src/auth.js');
  window._fcLoginCallback = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe('member PIN lockout (#41)', () => {
  it('locks the pad after 5 wrong PINs, even for the correct PIN', async () => {
    auth.memberSelect('Ann');
    for (let i = 0; i < 5; i++) await enter('0000');
    await enter('1234');
    expect(auth.currentMember()).toBe('');
    expect(err()).toMatch(/too many attempts/i);
  });

  it('4 wrong PINs do not lock', async () => {
    auth.memberSelect('Ann');
    for (let i = 0; i < 4; i++) await enter('0000');
    await enter('1234');
    expect(auth.currentMember()).toBe('Ann');
  });

  it('unlocks after 5 minutes', async () => {
    auth.memberSelect('Ann');
    for (let i = 0; i < 5; i++) await enter('0000');
    now += 5 * 60 * 1000 + 1;
    await enter('1234');
    expect(auth.currentMember()).toBe('Ann');
  });

  it('is per member: Bob is unaffected by Ann\'s lock', async () => {
    auth.memberSelect('Ann');
    for (let i = 0; i < 5; i++) await enter('0000');
    auth.memberPinBack();
    auth.memberSelect('Bob');
    await enter('4321');
    expect(auth.currentMember()).toBe('Bob');
  });

  it('a correct PIN clears earlier failures', async () => {
    auth.memberSelect('Ann');
    for (let i = 0; i < 4; i++) await enter('0000');
    await enter('1234');
    sessionStorage.clear();
    auth.memberSelect('Ann');
    for (let i = 0; i < 4; i++) await enter('0000');
    await enter('1234');
    expect(auth.currentMember()).toBe('Ann');
  });

  it('shows the lock message when the pad is opened while locked', async () => {
    auth.memberSelect('Ann');
    for (let i = 0; i < 5; i++) await enter('0000');
    auth.memberPinBack();
    auth.memberSelect('Ann');
    expect(err()).toMatch(/try again in \d+ min/i);
  });
});

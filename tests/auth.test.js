import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// auth.js has closure vars (_pendingMemberName, _memberPinBuffer).
// vi.resetModules() gives a fresh auth instance AND a fresh state instance,
// so we must re-import state.js after the reset to share the same object.

let currentMember, isAdmin, memberSelect, memberPinKey, memberPinDel, memberPinBack, switchUser;
let st; // reference to the fresh state object auth.js will read

function setupAuthDOM() {
  document.body.innerHTML = `
    <div id="pin-screen">
      <div id="pin-member-sub">Select your name</div>
      <div id="pin-member-name"></div>
      <div id="pin-member-pin" class="hidden">
        <div id="pin-member-dots">
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
        </div>
        <div id="pin-member-error"></div>
      </div>
      <div id="pin-member-chips"></div>
    </div>
  `;
}

beforeEach(async () => {
  vi.resetModules();
  setupAuthDOM();
  sessionStorage.clear();

  // Import fresh state FIRST — auth.js will get the same instance
  const stateMod = await import('../src/state.js');
  st = stateMod.state;
  st.members   = {};
  st.tasks     = {};
  st.history   = [];
  st.nextId    = 1;
  st.templates = {};

  const mod = await import('../src/auth.js');
  currentMember = mod.currentMember;
  isAdmin       = mod.isAdmin;
  memberSelect  = mod.memberSelect;
  memberPinKey  = mod.memberPinKey;
  memberPinDel  = mod.memberPinDel;
  memberPinBack = mod.memberPinBack;
  switchUser    = mod.switchUser;
});

afterEach(() => {
  sessionStorage.clear();
  document.body.innerHTML = '';
});

describe('currentMember', () => {
  it('returns "" when sessionStorage is empty', () => {
    expect(currentMember()).toBe('');
  });
  it('returns the stored member name', () => {
    sessionStorage.setItem('fc_member', 'Alice');
    expect(currentMember()).toBe('Alice');
  });
});

describe('isAdmin', () => {
  it('returns true when there are no members (setup mode)', () => {
    st.members = {};
    expect(isAdmin()).toBe(true);
  });
  it('returns true for a logged-in admin', () => {
    st.members = { Alice: { name: 'Alice', role: 'admin' } };
    sessionStorage.setItem('fc_member', 'Alice');
    expect(isAdmin()).toBe(true);
  });
  it('returns false for a logged-in regular member', () => {
    st.members = { Bob: { name: 'Bob', role: 'member' } };
    sessionStorage.setItem('fc_member', 'Bob');
    expect(isAdmin()).toBe(false);
  });
  it('returns false when no session is active (members exist)', () => {
    st.members = { Alice: { name: 'Alice', role: 'admin' } };
    // no sessionStorage entry
    expect(isAdmin()).toBe(false);
  });
  it('returns false for a session name not found in state', () => {
    st.members = { Alice: { name: 'Alice', role: 'admin' } };
    sessionStorage.setItem('fc_member', 'Ghost');
    expect(isAdmin()).toBe(false);
  });
});

describe('memberSelect', () => {
  it('completes login without PIN when member has no pinHash', () => {
    st.members = { Alice: { name: 'Alice', role: 'admin', pinHash: '' } };
    window._fcLoginCallback = vi.fn();
    memberSelect('Alice');
    expect(sessionStorage.getItem('fc_member')).toBe('Alice');
    expect(window._fcLoginCallback).toHaveBeenCalledOnce();
  });
  it('shows the PIN pad when member has a pinHash', () => {
    st.members = { Alice: { name: 'Alice', role: 'admin', pinHash: 'abc123' } };
    window._fcLoginCallback = vi.fn();
    memberSelect('Alice');
    const pinEl = document.getElementById('pin-member-pin');
    expect(pinEl.classList.contains('hidden')).toBe(false);
    expect(window._fcLoginCallback).not.toHaveBeenCalled();
  });
  it('completes login as null when member is not found in state', () => {
    st.members = {};
    window._fcLoginCallback = vi.fn();
    memberSelect('Nobody');
    expect(window._fcLoginCallback).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('fc_member')).toBeNull();
  });
});

describe('memberPinKey', () => {
  const KNOWN_PIN  = '1234';
  const KNOWN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

  beforeEach(() => {
    st.members = { Alice: { name: 'Alice', role: 'admin', pinHash: KNOWN_HASH } };
    window._fcLoginCallback = vi.fn();
    memberSelect('Alice'); // enter the PIN-pad flow
  });

  it('fills dot indicators as each digit is entered', async () => {
    await memberPinKey('1');
    const dots = document.querySelectorAll('#pin-member-dots .pin-dot');
    expect(dots[0].classList.contains('filled')).toBe(true);
    expect(dots[1].classList.contains('filled')).toBe(false);
  });
  it('completes login after the correct 4-digit PIN', async () => {
    for (const d of KNOWN_PIN) await memberPinKey(d);
    expect(sessionStorage.getItem('fc_member')).toBe('Alice');
    expect(window._fcLoginCallback).toHaveBeenCalledOnce();
  });
  it('shows error and does NOT log in on wrong PIN', async () => {
    for (const d of '9999') await memberPinKey(d);
    const errorEl = document.getElementById('pin-member-error');
    expect(errorEl.textContent).toBe('Incorrect PIN');
    expect(sessionStorage.getItem('fc_member')).toBeNull();
  });
  it('ignores extra digits after the buffer is full', async () => {
    for (const d of KNOWN_PIN) await memberPinKey(d); // logs in, clears buffer
    await memberPinKey('5'); // should be ignored
    // login already happened; no second callback call
    expect(window._fcLoginCallback).toHaveBeenCalledOnce();
  });
});

describe('memberPinDel', () => {
  beforeEach(() => {
    st.members = { Alice: { name: 'Alice', role: 'admin', pinHash: 'abc' } };
    window._fcLoginCallback = vi.fn();
    memberSelect('Alice');
  });

  it('removes the last entered digit from the buffer', async () => {
    await memberPinKey('1');
    await memberPinKey('2');
    memberPinDel();
    const dots = document.querySelectorAll('#pin-member-dots .pin-dot');
    expect(dots[0].classList.contains('filled')).toBe(true);
    expect(dots[1].classList.contains('filled')).toBe(false);
  });
  it('is a no-op when the buffer is empty', () => {
    expect(() => memberPinDel()).not.toThrow();
  });
});

describe('memberPinBack', () => {
  beforeEach(() => {
    st.members = {
      Alice: { name: 'Alice', role: 'admin', pinHash: 'abc' },
      Bob:   { name: 'Bob',   role: 'member', pinHash: ''  },
    };
    window._fcLoginCallback = vi.fn();
    memberSelect('Alice'); // navigate into PIN pad
  });

  it('re-renders member selector chips containing all members', () => {
    memberPinBack();
    const chips = document.getElementById('pin-member-chips');
    expect(chips.innerHTML).toContain('Alice');
    expect(chips.innerHTML).toContain('Bob');
  });
  it('hides the PIN pad again', () => {
    memberPinBack();
    expect(document.getElementById('pin-member-pin').classList.contains('hidden')).toBe(true);
  });
});

describe('switchUser', () => {
  it('clears the session and makes pin-screen visible', () => {
    st.members = { Alice: { name: 'Alice', role: 'admin', pinHash: '' } };
    sessionStorage.setItem('fc_member', 'Alice');
    const cb = vi.fn();
    switchUser(cb);
    expect(sessionStorage.getItem('fc_member')).toBeNull();
    expect(document.getElementById('pin-screen').classList.contains('hidden')).toBe(false);
  });
});

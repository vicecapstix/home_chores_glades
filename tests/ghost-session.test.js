import { describe, it, expect, vi, beforeEach } from 'vitest';

let checkSession, st;

beforeEach(async () => {
  vi.resetModules();
  document.body.innerHTML = '<div id="pin-screen" class="hidden"><div id="pin-member-sub"></div><div id="pin-member-name"></div><div id="pin-member-pin" class="hidden"></div><div id="pin-member-chips"></div></div>';
  sessionStorage.clear();
  st = (await import('../src/state.js')).state;
  st.members = { Alice: { name: 'Alice', role: 'admin' }, Bob: { name: 'Bob', role: 'member' } };
  checkSession = (await import('../src/auth.js')).checkSession;
});

describe('checkSession (#164)', () => {
  it('shows the picker and toasts when the member was renamed elsewhere', () => {
    sessionStorage.setItem('fc_member', 'Robert');
    const notify = vi.fn();
    expect(checkSession(notify)).toBe(true);
    expect(sessionStorage.getItem('fc_member')).toBeNull();
    expect(document.getElementById('pin-screen').classList.contains('hidden')).toBe(false);
    expect(document.querySelectorAll('#pin-member-chips button').length).toBe(2);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('pick it again'));
  });
  it('does the same when the member was removed', () => {
    sessionStorage.setItem('fc_member', 'Carol');
    expect(checkSession(vi.fn())).toBe(true);
    expect(document.getElementById('pin-screen').classList.contains('hidden')).toBe(false);
  });
  it('does nothing for an existing member', () => {
    sessionStorage.setItem('fc_member', 'Alice');
    const notify = vi.fn();
    expect(checkSession(notify)).toBe(false);
    expect(sessionStorage.getItem('fc_member')).toBe('Alice');
    expect(notify).not.toHaveBeenCalled();
    expect(document.getElementById('pin-screen').classList.contains('hidden')).toBe(true);
  });
  it('does nothing without a session', () => {
    expect(checkSession(vi.fn())).toBe(false);
    expect(document.getElementById('pin-screen').classList.contains('hidden')).toBe(true);
  });
});

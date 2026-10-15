import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

let admin = true;
vi.mock('../src/auth.js', () => ({ isAdmin: () => admin }));
vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchMember: vi.fn().mockResolvedValue(undefined) }));
import { patchMember } from '../src/firebase.js';
import * as ui from '../src/ui.js';

const DOTS = '<span class="pin-dot"></span>'.repeat(4);
beforeEach(() => {
  vi.clearAllMocks();
  admin = true;
  state.members = { Alice: { name: 'Alice', role: 'member' } };
  document.body.innerHTML = '<div id="setpin-modal" class="hidden"><span id="setpin-title"></span><div id="setpin-error"></div><div id="setpin-dots">' + DOTS + '</div></div><div id="toast"></div>';
});
const type = async code => { for (const d of code) await ui.setPinKey(d); };

describe('setPinKey', () => {
  it('saves a PIN hash for an existing member and toasts the captured name', async () => {
    ui.openSetPin('Alice');
    await type('1234');
    expect(patchMember).toHaveBeenCalledTimes(1);
    expect(patchMember.mock.calls[0][0]).toBe('Alice');
    expect(patchMember.mock.calls[0][1].pinHash).toMatch(/^[0-9a-f]{64}$/);
    expect(document.getElementById('toast').textContent).toBe('PIN saved for Alice');
  });
  it('does nothing for non-admins', async () => {
    ui.openSetPin('Alice');
    admin = false;
    await type('1234');
    expect(patchMember).not.toHaveBeenCalled();
  });
  it('does not write when no target is set (no bogus state/members/pinHash)', async () => {
    await type('1234');
    expect(patchMember).not.toHaveBeenCalled();
  });
  it('does not write for a name that is not a member', async () => {
    ui.openSetPin('Ghost');
    await type('1234');
    expect(patchMember).not.toHaveBeenCalled();
    expect(document.getElementById('setpin-error').textContent).toMatch(/not found/i);
  });
});

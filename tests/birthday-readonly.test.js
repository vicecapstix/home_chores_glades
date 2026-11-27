import { describe, it, expect, vi } from 'vitest';
import { state } from '../src/state.js';
vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ patchMember: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { patchMember } from '../src/firebase.js';
import { setBirthday, renderBirthdayBanner } from '../src/birthday.js';

describe('birthday on the readonly TV (#362)', () => {
  it('READONLY never writes, even for an admin', async () => {
    state.members = { Amy: { name: 'Amy', birthday: '11-27' } };
    await setBirthday('Amy', '01-01', () => true);
    expect(patchMember).not.toHaveBeenCalled();
  });
  it('the TV still shows the banner (display only)', () => {
    document.body.innerHTML = '<div id="birthday-banner" class="hidden"></div>';
    renderBirthdayBanner(state.members, new Date(2026, 10, 27, 9));
    expect(document.getElementById('birthday-banner').classList.contains('hidden')).toBe(false);
  });
});

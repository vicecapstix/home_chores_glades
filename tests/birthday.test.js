import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ patchMember: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { patchMember } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { validBirthday, birthdayNames, renderBirthdayBanner, setBirthday, birthdayAdminHTML } from '../src/birthday.js';
import { renamePaths } from '../src/members.js';

const admin = () => true, notAdmin = () => false;
const day = (m, d) => new Date(2026, m - 1, d, 12, 0, 0);

beforeEach(() => {
  vi.clearAllMocks();
  state.members = {
    Amy: { name: 'Amy', role: 'member', birthday: '11-27' },
    Bo: { name: 'Bo', role: 'member', birthday: '03-02' },
    Cy: { name: 'Cy', role: 'member' },
  };
  state.tasks = {}; state.history = [];
  document.body.innerHTML = '<div id="birthday-banner" class="double-banner birthday-banner hidden" role="status"></div>';
});

describe('birthday validation (#362)', () => {
  it('accepts real month-days only, including 29 Feb', () => {
    for (const v of ['01-01', '12-31', '02-29', '11-27']) expect(validBirthday(v)).toBe(v);
  });
  it('ignores invalid values', () => {
    for (const v of ['', null, undefined, '13-01', '00-10', '02-30', '04-31', '2026-11-27', '1-1', '11/27', 'abcd', 1127]) expect(validBirthday(v)).toBe('');
  });
});

describe('birthday banner (#362)', () => {
  it('shows the name on the local birthday only', () => {
    expect(birthdayNames(state.members, day(11, 27))).toEqual(['Amy']);
    expect(birthdayNames(state.members, day(11, 28))).toEqual([]);
  });
  it('renders the banner on the day and hides it otherwise', () => {
    renderBirthdayBanner(state.members, day(11, 27));
    const el = document.getElementById('birthday-banner');
    expect(el.classList.contains('hidden')).toBe(false);
    expect(el.textContent).toBe('🎂 Happy birthday, Amy!');
    renderBirthdayBanner(state.members, day(11, 28));
    expect(el.classList.contains('hidden')).toBe(true);
    expect(el.textContent).toBe('');
  });
  it('lists two birthdays together', () => {
    state.members.Bo.birthday = '11-27';
    renderBirthdayBanner(state.members, day(11, 27));
    expect(document.getElementById('birthday-banner').textContent).toBe('🎂 Happy birthday, Amy and Bo!');
  });
  it('never turns a member name into markup', () => {
    state.members['<img src=x onerror=alert(1)>'] = { name: '<img src=x onerror=alert(1)>', birthday: '11-27' };
    renderBirthdayBanner(state.members, day(11, 27));
    const el = document.getElementById('birthday-banner');
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>');
  });
  it('ignores an invalid stored birthday', () => {
    state.members.Cy.birthday = '13-45';
    expect(birthdayNames(state.members, day(11, 27))).toEqual(['Amy']);
  });
  it('treats 29 Feb as the birthday on 28 Feb in a non-leap year', () => {
    state.members.Cy.birthday = '02-29';
    expect(birthdayNames(state.members, new Date(2027, 1, 28))).toEqual(['Cy']);
    expect(birthdayNames(state.members, new Date(2028, 1, 28))).toEqual([]);
    expect(birthdayNames(state.members, new Date(2028, 1, 29))).toEqual(['Cy']);
  });
  it('is harmless with no members or no banner element', () => {
    expect(birthdayNames({}, day(11, 27))).toEqual([]);
    document.body.innerHTML = '';
    expect(() => renderBirthdayBanner(state.members, day(11, 27))).not.toThrow();
  });
});

describe('set birthday (admin) (#362)', () => {
  it('writes only the validated month-day on that member', async () => {
    await setBirthday('Cy', '07-04', admin);
    expect(patchMember).toHaveBeenCalledWith('Cy', { birthday: '07-04' });
  });
  it('clears it with an empty value', async () => {
    await setBirthday('Amy', '', admin);
    expect(patchMember).toHaveBeenCalledWith('Amy', { birthday: null });
  });
  it('rejects an invalid value with a toast and no write', async () => {
    await setBirthday('Cy', '02-30', admin);
    expect(patchMember).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });
  it('is blocked for a non-admin and for an unknown member', async () => {
    await setBirthday('Cy', '07-04', notAdmin);
    await setBirthday('Zed', '07-04', admin);
    expect(patchMember).not.toHaveBeenCalled();
  });
  it('toasts when the save fails', async () => {
    patchMember.mockRejectedValueOnce(new Error('boom'));
    await setBirthday('Cy', '07-04', admin);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
  it('the admin field escapes the member name and shows the stored value', () => {
    state.members['A"b'] = { name: 'A"b', birthday: '11-27' };
    const html = birthdayAdminHTML('A"b');
    expect(html).not.toContain('A"b');
    expect(html).toContain('value="11-27"');
    expect(html).toContain('window.setBirthday(');
  });
});

describe('birthday survives a rename (#362)', () => {
  it('the renamed member record keeps the birthday', () => {
    expect(renamePaths('Amy', 'Amelia')['members/Amelia'].birthday).toBe('11-27');
  });
});

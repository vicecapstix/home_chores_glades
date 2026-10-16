import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { AVATARS, avatarPrefix } from '../src/utils.js';
import { setAvatar } from '../src/members.js';
import { tvStripHTML } from '../src/tv.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { patchMember, writeState } from '../src/firebase.js';
import { showToast } from '../src/ui.js';

const admin = () => true, notAdmin = () => false;

beforeEach(() => {
  vi.clearAllMocks();
  state.members = { Ann: { name: 'Ann', role: 'member', weekPoints: 0 }, Bo: { name: 'Bo', role: 'member', avatar: '🦊' } };
});

describe('avatarPrefix', () => {
  it('returns the emoji plus a space only for allowed avatars', () => {
    expect(avatarPrefix({ avatar: AVATARS[0] })).toBe(AVATARS[0] + ' ');
    expect(avatarPrefix({ avatar: '<img src=x onerror=alert(1)>' })).toBe('');
    expect(avatarPrefix({ avatar: '💩' })).toBe('');
    expect(avatarPrefix({})).toBe('');
    expect(avatarPrefix(undefined)).toBe('');
  });
});

describe('setAvatar', () => {
  it('writes only the avatar field via patchMember', async () => {
    await setAvatar('Ann', '🐼', admin);
    expect(patchMember).toHaveBeenCalledWith('Ann', { avatar: '🐼' });
    expect(writeState).not.toHaveBeenCalled();
  });
  it('clears with an empty value', async () => {
    await setAvatar('Bo', '', admin);
    expect(patchMember).toHaveBeenCalledWith('Bo', { avatar: null });
  });
  it('is admin-only', async () => {
    await setAvatar('Ann', '🐼', notAdmin);
    expect(patchMember).not.toHaveBeenCalled();
  });
  it('rejects values outside the list and unknown members', async () => {
    await setAvatar('Ann', 'lol', admin);
    await setAvatar('Ann', '<b>', admin);
    await setAvatar('Ghost', '🐼', admin);
    expect(patchMember).not.toHaveBeenCalled();
  });
  it('never touches pinHash', async () => {
    state.members.Ann.pinHash = 'abc';
    await setAvatar('Ann', '🐼', admin);
    expect(Object.keys(patchMember.mock.calls[0][1])).toEqual(['avatar']);
  });
  it('shows a toast when the write fails', async () => {
    patchMember.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'NET' }));
    await setAvatar('Ann', '🐼', admin);
    expect(showToast).toHaveBeenCalled();
  });
});

describe('display', () => {
  it('TV strip shows the avatar before the name, and ignores tampered values', () => {
    const html = tvStripHTML({ Bo: { name: 'Bo', avatar: '🦊' }, Evil: { name: 'Evil', avatar: '<script>' } });
    expect(html).toContain('🦊 Bo');
    expect(html).not.toContain('<script>');
  });
});

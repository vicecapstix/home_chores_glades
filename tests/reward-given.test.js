import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  spendPoints: vi.fn(), refundPoints: vi.fn(), decideRedemption: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot } from '../src/firebase.js';
import { pushUndo } from '../src/undo.js';
import { toGive, markGiven } from '../src/redemptions.js';
import * as R from '../src/rewards.js';

const admin = () => true, notAdmin = () => false, asDad = () => 'Dad';
const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
const rd = (id, over = {}) => ({ id, rewardId: 'r1', rewardName: 'Ice cream ' + id, cost: 10, member: 'Alice', requestedAt: 1, status: 'approved', decidedAt: 100, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  document.body.innerHTML = doc.getElementById('rewards-modal').outerHTML + '<span id="rewards-badge" class="hidden"></span>';
  state.members = { Alice: { name: 'Alice', role: 'member', points: 5 }, Dad: { name: 'Dad', role: 'admin', points: 0 } };
  state.rewards = {};
  state.redemptions = {
    b: rd('b', { decidedAt: 300 }), a: rd('a', { decidedAt: 200 }),
    g: rd('g', { givenAt: 400, givenBy: 'Dad' }),
    p: rd('p', { status: 'pending', decidedAt: undefined }), d: rd('d', { status: 'denied' }),
  };
});

describe('toGive (#173)', () => {
  it('lists approved, not-yet-given requests oldest approval first', () => {
    expect(toGive().map(r => r.id)).toEqual(['a', 'b']);
  });
});

describe('markGiven (#173)', () => {
  it('writes givenAt/givenBy only, keeps status approved', async () => {
    await markGiven('a', admin, asDad);
    const f = patchRoot.mock.calls[0][0];
    expect(Object.keys(f).sort()).toEqual(['redemptions/a/givenAt', 'redemptions/a/givenBy']);
    expect(f['redemptions/a/givenBy']).toBe('Dad');
    expect(typeof f['redemptions/a/givenAt']).toBe('number');
    expect(state.redemptions.a.status).toBe('approved');
    expect(toGive().map(r => r.id)).toEqual(['b']);
  });
  it('is a no-op for non-admins', async () => {
    await markGiven('a', notAdmin, asDad);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('is a no-op in readonly (TV) mode', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', async () => ({ ...(await vi.importActual('../src/config.js')), READONLY: true }));
    const mod = await import('../src/redemptions.js');
    await mod.markGiven('a', admin, asDad);
    expect(patchRoot).not.toHaveBeenCalled();
    vi.doUnmock('../src/config.js');
  });
  it('ignores pending, denied, already-given and unknown ids', async () => {
    for (const id of ['p', 'd', 'g', 'nope']) await markGiven(id, admin, asDad);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('pushes an undo that clears both fields', async () => {
    await markGiven('a', admin, asDad);
    expect(pushUndo.mock.calls[0][0].verb).toBe('Given');
    await pushUndo.mock.calls[0][0].undo();
    expect(patchRoot).toHaveBeenLastCalledWith({ 'redemptions/a/givenAt': null, 'redemptions/a/givenBy': null });
    expect(state.redemptions.a.givenAt).toBeUndefined();
    expect(toGive().map(r => r.id)).toEqual(['a', 'b']);
  });
});

describe('rewards modal (#173)', () => {
  it('admin sees a To give list with Given buttons and the badge counts pending + to-give', () => {
    R.refreshRewards(admin);
    R.openRewards(admin, asDad);
    const pend = document.getElementById('rewards-pending').innerHTML;
    expect(pend).toContain('To give (2)');
    expect(pend).toContain('window.markRewardGiven');
    expect(document.getElementById('rewards-badge').textContent).toBe('3'); // 1 pending + 2 to give
  });
  it('members see Approved — waiting vs Given ✓ and no Given button', () => {
    R.openRewards(notAdmin, () => 'Alice');
    const pend = document.getElementById('rewards-pending').innerHTML;
    expect(pend).toContain('Approved — waiting');
    expect(pend).toContain('Given ✓');
    expect(pend).not.toContain('markRewardGiven');
    expect(document.getElementById('rewards-badge').classList.contains('hidden')).toBe(true);
  });
});

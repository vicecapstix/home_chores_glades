import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  adjustMemberPoints: vi.fn().mockResolvedValue({ ok: true, reason: '' }),
  appendHistory: vi.fn().mockResolvedValue({ ok: true }),
  removeHistoryEntry: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot, adjustMemberPoints, appendHistory } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import {
  validateClaim, pendingClaims, submitClaim, decideClaim, claimsAdminHTML, MAX_PENDING_PER_MEMBER,
} from '../src/claims.js';

const admin = () => true, notAdmin = () => false, asDad = () => 'Dad', asAmy = () => 'Amy';
const claim = (id, over = {}) => ({ id, member: 'Amy', name: 'Carried shopping', points: 5, requestedAt: Number(id.slice(1)) || 1, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  state.members = { Amy: { name: 'Amy', role: 'member', points: 3 }, Dad: { name: 'Dad', role: 'admin', points: 0 } };
  state.claims = {};
  state.history = [];
});

describe('validateClaim', () => {
  it('trims the name and accepts 1-20 whole points', () => {
    expect(validateClaim('  Washed car ', '8')).toEqual({ claim: { name: 'Washed car', points: 8 } });
    expect(validateClaim('x', 1).claim.points).toBe(1);
    expect(validateClaim('x', 20).claim.points).toBe(20);
  });
  it('rejects empty/too long names and bad points', () => {
    expect(validateClaim('   ', 5).error).toBeTruthy();
    expect(validateClaim('a'.repeat(61), 5).error).toBeTruthy();
    for (const p of [0, 21, -1, 2.5, '', 'abc']) expect(validateClaim('ok', p).error).toBeTruthy();
  });
});

describe('submitClaim', () => {
  it('writes one pending claim for the signed-in member', async () => {
    expect(await submitClaim('Carried shopping', 5, asAmy)).toBe(true);
    expect(patchRoot).toHaveBeenCalledTimes(1);
    const fields = patchRoot.mock.calls[0][0];
    const [path, entry] = Object.entries(fields)[0];
    expect(path).toBe('claims/' + entry.id);
    expect(entry).toMatchObject({ member: 'Amy', name: 'Carried shopping', points: 5 });
    expect(pendingClaims('Amy')).toHaveLength(1);
  });
  it('needs a member and a valid claim, and writes nothing otherwise', async () => {
    expect(await submitClaim('x', 5, () => '')).toBe(false);
    expect(await submitClaim('', 5, asAmy)).toBe(false);
    expect(await submitClaim('x', 99, asAmy)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('caps pending claims at 20 per member', async () => {
    for (let i = 1; i <= MAX_PENDING_PER_MEMBER; i++) state.claims['c' + i] = claim('c' + i);
    expect(await submitClaim('one more', 5, asAmy)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
    state.claims.d1 = claim('d1', { member: 'Dad' });
    expect(pendingClaims('Dad')).toHaveLength(1);
  });
  it('does not keep the claim if the write fails', async () => {
    patchRoot.mockRejectedValueOnce(new Error('boom'));
    expect(await submitClaim('x', 5, asAmy)).toBe(false);
    expect(pendingClaims('Amy')).toHaveLength(0);
  });
});

describe('decideClaim', () => {
  beforeEach(() => { state.claims = { c1: claim('c1') }; });

  it('approve awards the (edited) points once with one history entry, then removes the claim', async () => {
    expect(await decideClaim('c1', 'approved', 8, admin, asDad)).toBe(true);
    expect(adjustMemberPoints).toHaveBeenCalledTimes(1);
    expect(adjustMemberPoints.mock.calls[0][0]).toBe('Amy');
    expect(adjustMemberPoints.mock.calls[0][1].pts).toBe(8);
    expect(appendHistory).toHaveBeenCalledTimes(1);
    expect(appendHistory.mock.calls[0][0]).toMatchObject({ type: 'bonus', person: 'Amy', points: 8, by: 'Dad' });
    expect(patchRoot).toHaveBeenCalledWith({ 'claims/c1': null });
    expect(state.claims.c1).toBeUndefined();
  });
  it('approve uses the suggested points when none given', async () => {
    await decideClaim('c1', 'approved', undefined, admin, asDad);
    expect(adjustMemberPoints.mock.calls[0][1].pts).toBe(5);
  });
  it('deny only removes the claim: no points, no history', async () => {
    expect(await decideClaim('c1', 'denied', 5, admin, asDad)).toBe(true);
    expect(adjustMemberPoints).not.toHaveBeenCalled();
    expect(appendHistory).not.toHaveBeenCalled();
    expect(patchRoot).toHaveBeenCalledWith({ 'claims/c1': null });
  });
  it('is admin-only', async () => {
    expect(await decideClaim('c1', 'approved', 5, notAdmin, asAmy)).toBe(false);
    expect(adjustMemberPoints).not.toHaveBeenCalled();
    expect(patchRoot).not.toHaveBeenCalled();
    expect(state.claims.c1).toBeTruthy();
  });
  it('ignores unknown/already-decided claims and bad statuses', async () => {
    expect(await decideClaim('nope', 'approved', 5, admin, asDad)).toBe(false);
    expect(await decideClaim('c1', 'maybe', 5, admin, asDad)).toBe(false);
    expect(adjustMemberPoints).not.toHaveBeenCalled();
  });
  it('a double tap approves only once', async () => {
    const a = decideClaim('c1', 'approved', 5, admin, asDad);
    const b = decideClaim('c1', 'approved', 5, admin, asDad);
    await Promise.all([a, b]);
    expect(adjustMemberPoints).toHaveBeenCalledTimes(1);
  });
  it('puts the claim back if the points update fails', async () => {
    adjustMemberPoints.mockResolvedValueOnce({ ok: false, reason: 'missing' });
    expect(await decideClaim('c1', 'approved', 5, admin, asDad)).toBe(false);
    expect(state.claims.c1).toBeTruthy();
    expect(patchRoot).toHaveBeenLastCalledWith({ 'claims/c1': expect.objectContaining({ id: 'c1' }) });
  });
});

describe('claims UI', () => {
  it('escapes names in the admin list and offers Approve/Deny', () => {
    const html = claimsAdminHTML([claim('c1', { name: '<img src=x onerror=alert(1)>', member: '<b>Amy</b>' })]);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>Amy');
    expect(html).toContain('window.approveClaim');
    expect(html).toContain('window.denyClaim');
  });
  it('index.html has the member claim form inside the rewards modal', () => {
    const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const form = doc.querySelector('#rewards-modal #claim-form');
    expect(form).toBeTruthy();
    expect(form.querySelector('#claim-name').getAttribute('maxlength')).toBe('60');
    expect(form.querySelector('#claim-points')).toBeTruthy();
  });
});

describe('claims in readonly (TV) mode', () => {
  it('submit and decide are no-ops', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', async () => ({ ...(await vi.importActual('../src/config.js')), READONLY: true }));
    const mod = await import('../src/claims.js');
    const { state: st } = await import('../src/state.js');
    st.members = { Amy: { name: 'Amy', role: 'member', points: 1 } };
    st.claims = { c1: claim('c1') };
    expect(await mod.submitClaim('x', 5, asAmy)).toBe(false);
    expect(await mod.decideClaim('c1', 'approved', 5, admin, asDad)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
    vi.doUnmock('../src/config.js');
  });
});

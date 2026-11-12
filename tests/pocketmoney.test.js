import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ patchRoot: vi.fn().mockResolvedValue(undefined), patchPaths: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot, patchPaths } from '../src/firebase.js';
import { pushUndo } from '../src/undo.js';
import { validRate, owed, owedHTML, setPocketMoney, clearPocketMoney, markPaid, PAYOUT_CAP } from '../src/pocketmoney.js';
import { tvStripHTML } from '../src/tv.js';

const admin = () => true;
const notAdmin = () => false;
const me = () => 'Mum';

beforeEach(() => {
  vi.clearAllMocks();
  state.pocketMoney = { pts: 10, amount: 1 };
  state.members = { Kid: { name: 'Kid', role: 'member', points: 37 }, Mum: { name: 'Mum', role: 'admin', points: 0 } };
});

describe('rate (criterion 1: admin sets a display-only rate)', () => {
  it('validates whole pts 1-1000 and amount 0.01-1000 with 2 decimals', () => {
    expect(validRate(10, '1')).toEqual({ pts: 10, amount: 1 });
    expect(validRate(1000, 1000)).toEqual({ pts: 1000, amount: 1000 });
    for (const [p, a] of [[0, 1], [1001, 1], [1.5, 1], [10, 0], [10, '0.001'], [10, 1001], [10, ''], [10, '-1'], [10, 'x']]) expect(validRate(p, a)).toBeNull();
  });
  it('admin saves only the rate at the root; points untouched', async () => {
    expect(await setPocketMoney(10, '1.50', admin)).toBe(true);
    expect(patchRoot).toHaveBeenCalledWith({ pocketMoney: { pts: 10, amount: 1.5 } });
    expect(state.members.Kid.points).toBe(37);
    expect(await clearPocketMoney(admin)).toBe(true);
    expect(patchRoot).toHaveBeenLastCalledWith({ pocketMoney: null });
  });
  it('rejects bad rate and non-admin', async () => {
    expect(await setPocketMoney(0, 1, admin)).toBe(false);
    expect(await setPocketMoney(10, 1, notAdmin)).toBe(false);
    expect(await clearPocketMoney(notAdmin)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
  });
});

describe('owed calculation (criterion 2)', () => {
  it('no payouts yet: all points count', () => {
    expect(owed(state.members.Kid)).toEqual({ pts: 37, cents: 370 });
  });
  it('counts only points since the last payout', () => {
    state.members.Kid.payouts = { p1: { at: 1, by: 'Mum', points: 10 }, p2: { at: 2, by: 'Mum', points: 30 } };
    expect(owed(state.members.Kid)).toEqual({ pts: 7, cents: 70 });
  });
  it('floors to cents and never goes negative', () => {
    state.pocketMoney = { pts: 3, amount: 1 };
    expect(owed({ points: 4 }).cents).toBe(133);
    state.members.Kid.payouts = { p1: { at: 1, points: 50 } };
    expect(owed(state.members.Kid)).toEqual({ pts: 0, cents: 0 });
  });
  it('feature off shows nothing', () => {
    state.pocketMoney = null;
    expect(owedHTML(state.members.Kid)).toBe('');
  });
  it('shows on the readonly TV strip and escapes', () => {
    const html = tvStripHTML({ 'A<i>': { name: 'A<i>', points: 20 } }, [], {});
    expect(html).toContain('$2.00 (20 pts)');
    expect(html).not.toContain('<i>');
  });
});

describe('Mark paid (criterion 3)', () => {
  it('records {at, by, points} touching only that member payouts', async () => {
    expect(await markPaid('Kid', admin, me)).toBe(true);
    const paths = patchPaths.mock.calls[0][0];
    const keys = Object.keys(paths);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^members\/Kid\/payouts\/p\d+$/);
    expect(paths[keys[0]]).toEqual({ at: expect.any(Number), by: 'Mum', points: 37 });
    expect(owed(state.members.Kid).pts).toBe(0);
  });
  it('caps at 52 per member, dropping the oldest', async () => {
    const p = {};
    for (let i = 1; i <= PAYOUT_CAP; i++) p['p' + i] = { at: i, by: 'Mum', points: i };
    state.members.Kid.payouts = p;
    await markPaid('Kid', admin, me);
    expect(patchPaths.mock.calls[0][0]['members/Kid/payouts/p1']).toBeNull();
    expect(Object.keys(state.members.Kid.payouts)).toHaveLength(PAYOUT_CAP);
    expect(state.members.Kid.payouts.p1).toBeUndefined();
  });
  it('undo removes exactly that entry (and restores a dropped one)', async () => {
    const p = {};
    for (let i = 1; i <= PAYOUT_CAP; i++) p['p' + i] = { at: i, by: 'Mum', points: i };
    state.members.Kid.payouts = p;
    await markPaid('Kid', admin, me);
    const first = patchPaths.mock.calls[0][0];
    const added = Object.keys(first).find(k => first[k]);
    await pushUndo.mock.calls[0][0].undo();
    const back = patchPaths.mock.calls[1][0];
    expect(back[added]).toBeNull();
    expect(back['members/Kid/payouts/p1']).toEqual({ at: 1, by: 'Mum', points: 1 });
    expect(Object.keys(back)).toHaveLength(2);
  });
  it('failed write does not change state or push undo', async () => {
    patchPaths.mockRejectedValueOnce(new Error('x'));
    expect(await markPaid('Kid', admin, me)).toBe(false);
    expect(state.members.Kid.payouts).toBeUndefined();
    expect(pushUndo).not.toHaveBeenCalled();
  });
  it('in-flight guard blocks a double click', async () => {
    const [a, b] = await Promise.all([markPaid('Kid', admin, me), markPaid('Kid', admin, me)]);
    expect([a, b]).toEqual([true, false]);
    expect(patchPaths).toHaveBeenCalledTimes(1);
  });
  it('non-admin and rate-off are blocked', async () => {
    expect(await markPaid('Kid', notAdmin, me)).toBe(false);
    state.pocketMoney = null;
    expect(await markPaid('Kid', admin, me)).toBe(false);
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

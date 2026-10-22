import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

let adjustResult;
vi.mock('../src/firebase.js', () => ({
  adjustMemberPoints: vi.fn(async () => adjustResult),
  patchRoot: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { adjustMemberPoints, patchRoot } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { pushUndo } from '../src/undo.js';
import { adjustBonus, validateBonus } from '../src/bonus.js';
import { historyHTML } from '../src/history.js';
import { weekRecap } from '../src/utils.js';

const admin = () => true;
const nobody = () => false;
const asDad = () => 'Dad';

beforeEach(() => {
  vi.clearAllMocks();
  adjustResult = { ok: true, reason: '' };
  state.members = { Alice: { name: 'Alice', role: 'member', points: 10 }, Dad: { name: 'Dad', role: 'admin', points: 0 } };
  state.history = [];
});

describe('adjustBonus', () => {
  it('awards points atomically, counts toward the week, and logs history', async () => {
    expect(await adjustBonus('Alice', 5, '  Helped Grandma ', admin, asDad)).toBe(true);
    const opts = adjustMemberPoints.mock.calls[0][1];
    expect(adjustMemberPoints.mock.calls[0][0]).toBe('Alice');
    expect(opts).toMatchObject({ pts: 5, count: 0, countWeek: true });
    const h = patchRoot.mock.calls[0][0].history;
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ type: 'bonus', person: 'Alice', points: 5, reason: 'Helped Grandma', by: 'Dad' });
    expect(typeof h[0].completedAt).toBe('number');
    expect(pushUndo).toHaveBeenCalledTimes(1);
  });

  it('deduction does not touch week points', async () => {
    await adjustBonus('Alice', -3, 'Broke a plate', admin, asDad);
    expect(adjustMemberPoints.mock.calls[0][1]).toMatchObject({ pts: -3, countWeek: false });
    expect(patchRoot.mock.calls[0][0].history[0].points).toBe(-3);
  });

  it('asks for confirmation before going below 0 and aborts when declined', async () => {
    adjustResult = { ok: false, reason: 'insufficient' };
    const confirmFn = vi.fn(() => false);
    expect(await adjustBonus('Alice', -40, 'Oops', admin, asDad, confirmFn)).toBe(false);
    expect(confirmFn).toHaveBeenCalled();
    expect(adjustMemberPoints).toHaveBeenCalledTimes(1);
    expect(patchRoot).not.toHaveBeenCalled();
  });

  it('goes below 0 when confirmed', async () => {
    adjustMemberPoints.mockResolvedValueOnce({ ok: false, reason: 'insufficient' });
    expect(await adjustBonus('Alice', -40, 'Oops', admin, asDad, () => true)).toBe(true);
    expect(adjustMemberPoints.mock.calls[1][1]).toMatchObject({ pts: -40, allowNegative: true });
    expect(patchRoot).toHaveBeenCalled();
  });

  it('keeps history capped at 500', async () => {
    state.history = Array.from({ length: 500 }, (_, i) => ({ taskName: 'x', person: 'Alice', completedAt: i + 1, points: 1 }));
    await adjustBonus('Alice', 1, 'r', admin, asDad);
    const h = patchRoot.mock.calls[0][0].history;
    expect(h).toHaveLength(500);
    expect(h[499].type).toBe('bonus');
  });

  it('undo reverses the points and removes the history entry', async () => {
    await adjustBonus('Alice', 5, 'Help', admin, asDad);
    state.history = patchRoot.mock.calls[0][0].history;
    await pushUndo.mock.calls[0][0].undo();
    expect(adjustMemberPoints.mock.calls[1][1]).toMatchObject({ pts: -5, allowNegative: true });
    expect(patchRoot.mock.calls[1][0].history).toHaveLength(0);
  });

  it.each([[0], [51], [-51], [1.5], [NaN]])('rejects amount %s', async amt => {
    expect(await adjustBonus('Alice', amt, 'ok', admin, asDad)).toBe(false);
    expect(showToast).toHaveBeenCalled();
    expect(adjustMemberPoints).not.toHaveBeenCalled();
  });

  it('validates reason: required, max 60', () => {
    expect(validateBonus(5, '   ')).not.toBe('');
    expect(validateBonus(5, 'x'.repeat(61))).not.toBe('');
    expect(validateBonus(5, 'x'.repeat(60))).toBe('');
    expect(validateBonus(50, 'ok')).toBe('');
    expect(validateBonus(-50, 'ok')).toBe('');
  });

  it('is a no-op for non-admins', async () => {
    expect(await adjustBonus('Alice', 5, 'r', nobody, asDad)).toBe(false);
    expect(adjustMemberPoints).not.toHaveBeenCalled();
    expect(patchRoot).not.toHaveBeenCalled();
  });

  it('is a no-op for unknown members', async () => {
    expect(await adjustBonus('Zed', 5, 'r', admin, asDad)).toBe(false);
    expect(adjustMemberPoints).not.toHaveBeenCalled();
  });
});

describe('bonus display', () => {
  const entry = { type: 'bonus', person: 'Alice', points: -3, reason: '<img src=x onerror=1>', by: 'Dad', completedAt: Date.now() };
  it('history shows "Bonus: reason" escaped with a signed value', () => {
    const html = historyHTML([entry], ['Alice'], '');
    expect(html).toContain('Bonus: &lt;img');
    expect(html).not.toContain('<img');
    expect(html).toContain('>-3<');
  });
  it('weekly recap sums bonus points without counting a completion', () => {
    const ts = new Date(2026, 9, 14, 12).getTime();
    const rows = weekRecap([{ person: 'Alice', completedAt: ts, points: 2, taskName: 't' }, { ...entry, completedAt: ts, points: 5 }], '2026-10-12');
    expect(rows[0]).toMatchObject({ name: 'Alice', points: 7, count: 1 });
  });
});

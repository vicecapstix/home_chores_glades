import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

const cfg = vi.hoisted(() => ({ ro: false }));
vi.mock('../src/config.js', async orig => ({ ...(await orig()), get READONLY() { return cfg.ro; } }));
vi.mock('../src/firebase.js', () => ({ patchPaths: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { patchPaths } from '../src/firebase.js';
import { dueStatus } from '../src/utils.js';
import { checkOffExpiry } from '../src/seasonal.js';

const L = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const base = { id: 'a', name: 'A', freq: 'weekly', person: '', difficulty: 'easy', subtasks: {} };

beforeEach(() => {
  vi.clearAllMocks(); cfg.ro = false; state.pause = null; state.members = {};
});
afterEach(() => { cfg.ro = false; });

describe('seasonal switch-back fixes (#308)', () => {
  it('a done chore only loses offUntil: lastDone and lastDoneBy stay intact', () => {
    const lastDone = L(2026, 6, 8);
    state.tasks = { a: { ...base, freq: 'weekdays', days: [1, 2], done: true, lastDone, lastDoneBy: 'Ann', offUntil: '2026-06-09' } };
    checkOffExpiry(L(2026, 6, 10));
    expect(patchPaths).toHaveBeenCalledTimes(1);
    expect(patchPaths).toHaveBeenCalledWith({ 'tasks/a/offUntil': null });
    expect(state.tasks.a.lastDone).toBe(lastDone);
    expect(state.tasks.a.offUntil).toBeUndefined();
  });
  it('a not-done chore is still switched back on as due that day', () => {
    state.tasks = { a: { ...base, done: false, lastDone: L(2026, 1, 1), offUntil: '2026-06-09' } };
    checkOffExpiry(L(2026, 6, 10));
    const p = patchPaths.mock.calls[0][0];
    expect(p['tasks/a/offUntil']).toBe(null);
    expect(p['tasks/a/lastDone']).toBeGreaterThan(L(2026, 6, 1));
  });
  it('does nothing while the house is paused', () => {
    state.pause = { until: '2026-01-05', by: 'Ann', since: L(2025, 12, 20) };
    state.tasks = { a: { ...base, done: false, lastDone: L(2025, 12, 1), offUntil: '2025-12-31' } };
    checkOffExpiry(L(2026, 1, 1));
    expect(patchPaths).not.toHaveBeenCalled();
    expect(state.tasks.a.offUntil).toBe('2025-12-31');
  });
  it('an expired, not-yet-cleared offUntil displays as due, not overdue, without writing (readonly TV)', () => {
    cfg.ro = true;
    const t = { ...base, done: false, lastDone: L(2026, 1, 1), offUntil: '2026-06-09' };
    state.tasks = { a: t };
    checkOffExpiry(L(2026, 6, 10));
    expect(patchPaths).not.toHaveBeenCalled();
    expect(dueStatus(t, L(2026, 6, 10))).not.toBe('overdue');
    expect(dueStatus(t, L(2026, 6, 10))).toBe('soon');
    expect(t.lastDone).toBe(L(2026, 1, 1)); // display only
  });
  it('a done expired chore keeps showing done', () => {
    expect(dueStatus({ ...base, done: true, lastDone: L(2026, 6, 8), offUntil: '2026-06-09' }, L(2026, 6, 10))).toBe('done');
  });
});

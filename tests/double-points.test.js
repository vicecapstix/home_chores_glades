import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state, applySnapshot } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(), patchPaths: vi.fn(),
  adjustMemberPoints: vi.fn().mockResolvedValue({ ok: true }),
  appendHistory: vi.fn().mockResolvedValue(undefined),
  removeHistoryEntry: vi.fn().mockResolvedValue({ removed: false }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot, patchTask, adjustMemberPoints, appendHistory } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { validDoublePoints, activeMultiplier, renderDoublePointsBanner, setDoublePoints, clearDoublePoints, doublePointsAdminHTML } from '../src/doublepoints.js';
import { toggleTask } from '../src/tasks.js';

const NOW = new Date(2026, 9, 14, 12, 0); // Wed 14 Oct 2026
const admin = () => true, member = () => false;
const bob = () => 'Bob';

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW);
  state.doublePoints = null;
  state.members = { Bob: { name: 'Bob', role: 'member', points: 0 } };
  state.tasks = { a: { id: 'a', name: 'A', freq: 'weekly', difficulty: 'medium', person: 'Bob', done: false, lastDone: 0 } }; // 3 x 2 = 6 base
  document.body.innerHTML = '<div id="double-banner" class="hidden"></div>';
});
afterEach(() => vi.useRealTimers());

describe('validation (admin sets one date and ×2/×3)', () => {
  it('accepts today and later with 2 or 3', () => {
    expect(validDoublePoints('2026-10-14', 2)).toEqual({ date: '2026-10-14', mult: 2 });
    expect(validDoublePoints('2026-12-25', '3')).toEqual({ date: '2026-12-25', mult: 3 });
  });
  it('rejects past dates, fake dates, bad formats and other multipliers', () => {
    expect(validDoublePoints('2026-10-13', 2)).toBeNull();
    expect(validDoublePoints('2026-02-30', 2)).toBeNull();
    expect(validDoublePoints('14/10/2026', 2)).toBeNull();
    expect(validDoublePoints('2026-10-14', 4)).toBeNull();
    expect(validDoublePoints('2026-10-14', 1)).toBeNull();
    expect(validDoublePoints('', 2)).toBeNull();
  });
});

describe('multiplier applied on the date only, stored for exact reversal', () => {
  it('awards ×2 on the event date: lastDonePoints, member points and history all multiplied', async () => {
    state.doublePoints = { date: '2026-10-14', mult: 2 };
    await toggleTask('a', bob, member);
    expect(patchTask).toHaveBeenCalledWith('a', expect.objectContaining({ done: true, lastDonePoints: 12 }));
    expect(adjustMemberPoints).toHaveBeenCalledWith('Bob', expect.objectContaining({ pts: 12 }));
    expect(appendHistory).toHaveBeenCalledWith(expect.objectContaining({ points: 12 }));
  });
  it('awards the normal amount on other days and with no event', async () => {
    state.doublePoints = { date: '2026-10-15', mult: 3 };
    await toggleTask('a', bob, member);
    expect(patchTask).toHaveBeenCalledWith('a', expect.objectContaining({ lastDonePoints: 6 }));
    expect(activeMultiplier(null, NOW)).toBe(1);
  });
  it('uncheck reverses exactly the stored multiplied amount, even after the event day', async () => {
    state.doublePoints = { date: '2026-10-14', mult: 3 };
    await toggleTask('a', bob, member);
    state.tasks.a = { ...state.tasks.a, done: true, lastDoneBy: 'Bob', lastDonePoints: 18, lastDone: NOW.getTime() };
    vi.setSystemTime(new Date(2026, 9, 15, 9, 0)); // next day: event over
    adjustMemberPoints.mockClear();
    await toggleTask('a', bob, member);
    expect(adjustMemberPoints).toHaveBeenCalledWith('Bob', expect.objectContaining({ pts: -18 }));
  });
  it('ignores a malformed multiplier read from the database', () => {
    expect(activeMultiplier({ date: '2026-10-14', mult: 50 }, NOW)).toBe(1);
  });
});

describe('banner (visible to everyone incl. the TV)', () => {
  it('shows on the event date and hides after it', () => {
    renderDoublePointsBanner({ date: '2026-10-14', mult: 2 }, NOW);
    const el = document.getElementById('double-banner');
    expect(el.classList.contains('hidden')).toBe(false);
    expect(el.textContent).toContain('×2');
    renderDoublePointsBanner({ date: '2026-10-14', mult: 2 }, new Date(2026, 9, 15));
    expect(el.classList.contains('hidden')).toBe(true);
    expect(el.textContent).toBe('');
  });
  it('is hidden with no event', () => {
    renderDoublePointsBanner(null, NOW);
    expect(document.getElementById('double-banner').classList.contains('hidden')).toBe(true);
  });
});

describe('admin set / clear', () => {
  it('admin sets and clears the event', async () => {
    expect(await setDoublePoints('2026-10-20', '3', admin)).toBe(true);
    expect(patchRoot).toHaveBeenCalledWith({ doublePoints: { date: '2026-10-20', mult: 3 } });
    expect(state.doublePoints).toEqual({ date: '2026-10-20', mult: 3 });
    expect(await clearDoublePoints(admin)).toBe(true);
    expect(patchRoot).toHaveBeenLastCalledWith({ doublePoints: null });
    expect(state.doublePoints).toBeNull();
  });
  it('non-admin cannot set or clear', async () => {
    expect(await setDoublePoints('2026-10-20', 2, member)).toBe(false);
    expect(await clearDoublePoints(member)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('invalid input writes nothing and toasts', async () => {
    expect(await setDoublePoints('2026-10-01', 2, admin)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });
  it('a failed save keeps state and toasts', async () => {
    patchRoot.mockRejectedValueOnce(new Error('offline'));
    expect(await setDoublePoints('2026-10-20', 2, admin)).toBe(false);
    expect(state.doublePoints).toBeNull();
  });
  it('admin form escapes stored values and offers Clear only when set', () => {
    state.doublePoints = { date: '"><img src=x>', mult: 2 };
    const html = doublePointsAdminHTML();
    expect(html).not.toContain('<img');
    expect(html).toContain('clearDoublePoints');
    state.doublePoints = null;
    expect(doublePointsAdminHTML()).not.toContain('clearDoublePoints');
  });
});

describe('snapshot', () => {
  it('applySnapshot keeps a valid event and drops an empty one', () => {
    applySnapshot({ members: {}, tasks: {}, doublePoints: { date: '2026-10-14', mult: 2 } });
    expect(state.doublePoints).toEqual({ date: '2026-10-14', mult: 2 });
    applySnapshot({ members: {}, tasks: {} });
    expect(state.doublePoints).toBeNull();
  });
});

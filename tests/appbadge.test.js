// #399: app icon badge = my chores still due today. Browser API mocked; Firebase never touched.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const NOW = new Date(2026, 10, 18, 9).getTime();
const DAY = 86400000;
const mk = (o) => ({ freq: 'daily', done: false, lastDone: NOW - 2 * DAY, person: 'Bo', subtasks: {}, ...o });

async function load(readonly = false) {
  vi.resetModules();
  vi.doMock('../src/config.js', async orig => ({ ...(await orig()), READONLY: readonly }));
  return import('../src/appbadge.js');
}
function nav({ withClear = true } = {}) {
  return { setAppBadge: vi.fn().mockResolvedValue(undefined), ...(withClear ? { clearAppBadge: vi.fn().mockResolvedValue(undefined) } : {}) };
}

describe('remainingToday (#399)', () => {
  it('counts my overdue and due-today chores, not done, others\' or on-track ones', async () => {
    const { remainingToday } = await load();
    const tasks = {
      a: mk({ id: 'a' }),                                          // overdue
      b: mk({ id: 'b', lastDone: NOW - DAY }),                     // daily due today
      c: mk({ id: 'c', person: 'Cy' }),                            // someone else
      d: mk({ id: 'd', done: true, lastDone: NOW - 3600000 }),     // done today
      e: mk({ id: 'e', freq: 'weekly', lastDone: NOW - DAY }),     // on track
    };
    expect(remainingToday(tasks, 'Bo', NOW)).toBe(2);
  });
  it('is 0 with no member', async () => {
    const { remainingToday } = await load();
    expect(remainingToday({ a: mk({ id: 'a' }) }, '', NOW)).toBe(0);
  });
});

describe('updateAppBadge (#399)', () => {
  beforeEach(() => vi.useRealTimers());
  it('sets the badge to the count', async () => {
    const { updateAppBadge } = await load(); const n = nav();
    updateAppBadge({ a: mk({ id: 'a' }), b: mk({ id: 'b' }) }, 'Bo', NOW, n);
    expect(n.setAppBadge).toHaveBeenCalledWith(2);
  });
  it('clears at 0', async () => {
    const { updateAppBadge } = await load(); const n = nav();
    updateAppBadge({ a: mk({ id: 'a', done: true, lastDone: NOW - 1000 }) }, 'Bo', NOW, n);
    expect(n.clearAppBadge).toHaveBeenCalled(); expect(n.setAppBadge).not.toHaveBeenCalled();
  });
  it('clears with setAppBadge(0) when clearAppBadge is missing', async () => {
    const { updateAppBadge } = await load(); const n = nav({ withClear: false });
    updateAppBadge({}, 'Bo', NOW, n);
    expect(n.setAppBadge).toHaveBeenCalledWith(0);
  });
  it('does not re-send an unchanged value', async () => {
    const { updateAppBadge } = await load(); const n = nav();
    const t = { a: mk({ id: 'a' }) };
    updateAppBadge(t, 'Bo', NOW, n); updateAppBadge(t, 'Bo', NOW, n);
    expect(n.setAppBadge).toHaveBeenCalledTimes(1);
  });
  it('clears when signed out', async () => {
    const { updateAppBadge } = await load(); const n = nav();
    updateAppBadge({ a: mk({ id: 'a' }) }, 'Bo', NOW, n);
    updateAppBadge({ a: mk({ id: 'a' }) }, '', NOW, n);
    expect(n.clearAppBadge).toHaveBeenCalled();
  });
  it('skips silently where the Badging API is missing', async () => {
    const { updateAppBadge } = await load();
    expect(() => updateAppBadge({ a: mk({ id: 'a' }) }, 'Bo', NOW, {})).not.toThrow();
  });
  it('never touches the badge in READONLY', async () => {
    const { updateAppBadge } = await load(true); const n = nav();
    updateAppBadge({ a: mk({ id: 'a' }) }, 'Bo', NOW, n);
    expect(n.setAppBadge).not.toHaveBeenCalled(); expect(n.clearAppBadge).not.toHaveBeenCalled();
  });
  it('swallows a rejected promise', async () => {
    const { updateAppBadge } = await load(); const n = nav();
    n.setAppBadge.mockRejectedValue(new Error('denied'));
    updateAppBadge({ a: mk({ id: 'a' }) }, 'Bo', NOW, n);
    await Promise.resolve();
  });
});

describe('render() updates the badge (#399)', () => {
  it('render.js calls updateAppBadge', async () => {
    const { readFileSync } = await import('node:fs'); const { resolve } = await import('node:path');
    const src = readFileSync(resolve(__dirname, '../src/render.js'), 'utf8');
    expect(src).toMatch(/updateAppBadge\(/);
  });
});

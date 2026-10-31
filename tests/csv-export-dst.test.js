import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

let UI, state;
const origTZ = process.env.TZ;
beforeAll(() => { process.env.TZ = 'Europe/London'; });
afterAll(() => { if (origTZ === undefined) delete process.env.TZ; else process.env.TZ = origTZ; });
beforeEach(async () => {
  vi.resetModules();
  state = (await import('../src/state.js')).state;
  UI = await import('../src/ui.js');
});

function rowsFor(from, to, stamps) {
  state.tasks = { t1: { id: 't1', freq: 'daily', difficulty: 'easy' } };
  state.history = stamps.map(ts => ({ taskId: 't1', taskName: 'Dishes', person: 'Al', completedAt: ts, points: 1 }));
  let href = '';
  const origCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(tag => {
    const el = origCreate(tag);
    if (tag === 'a') el.click = () => { href = el.href; };
    return el;
  });
  UI.exportCSV(from, to);
  return decodeURIComponent(href.replace('data:text/csv;charset=utf-8,', '')).split('\n').slice(1).filter(Boolean);
}

describe('CSV export range on DST change days (#251)', () => {
  it('sanity: the test zone has a 25-hour autumn day', () => {
    expect(new Date(2026, 9, 26).getTime() - new Date(2026, 9, 25).getTime()).toBe(25 * 3600000);
  });
  it('includes 23:30 on the autumn (25-hour) day', () => {
    const rows = rowsFor('2026-10-25', '2026-10-25', [new Date(2026, 9, 25, 23, 30).getTime()]);
    expect(rows).toHaveLength(1);
    expect(rows[0].startsWith('2026-10-25,23:30')).toBe(true);
  });
  it('excludes 00:30 the day after the spring (23-hour) day', () => {
    const rows = rowsFor('2026-03-29', '2026-03-29', [new Date(2026, 2, 29, 12, 0).getTime(), new Date(2026, 2, 30, 0, 30).getTime()]);
    expect(rows).toHaveLength(1);
    expect(rows[0].startsWith('2026-03-29')).toBe(true);
  });
});

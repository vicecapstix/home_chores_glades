import { describe, it, expect } from 'vitest';
import { weekPlan } from '../src/utils.js';
import { buildWeekIcs } from '../src/weekics.js';
import { chartRows } from '../src/printchart.js';

// Mon 2026-10-12 .. Sun 2026-10-18; now = Mon 12th noon
const NOW = new Date(2026, 9, 12, 12).getTime();
const T = (o) => ({ id: 'tx', name: 'Dishes', freq: 'daily', person: 'Alice', done: false, lastDone: 0, ...o });
const on = (plan, date) => plan.find(d => d.date === date).items.map(i => i.name);

describe('#350 offUntil is per day', () => {
  it('weekPlan hides Mon-Wed and shows Thu-Sun', () => {
    const p = weekPlan({ a: T({ offUntil: '2026-10-14' }) }, NOW);
    ['2026-10-12', '2026-10-13', '2026-10-14'].forEach(d => expect(on(p, d)).toEqual([]));
    ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'].forEach(d => expect(on(p, d)).toEqual(['Dishes']));
  });
  it('weekPlan hides a chore off all week', () => {
    const p = weekPlan({ a: T({ offUntil: '2026-10-18' }) }, NOW);
    expect(p.every(d => d.items.length === 0)).toBe(true);
  });
  it('ics includes the chore only after offUntil', () => {
    const ics = buildWeekIcs({ a: T({ offUntil: '2026-10-14' }) }, "", NOW);
    expect(ics).toContain('20261015');
    expect(ics).not.toContain('DTSTART;VALUE=DATE:20261013');
  });
  it('print chart marks only Thu-Sun', () => {
    const g = chartRows({ a: T({ offUntil: '2026-10-14' }) }, ['Alice'], '2026-10-12');
    expect(g[0].rows[0].days).toEqual([false, false, false, true, true, true, true]);
  });
  it('print chart drops a chore off the whole week, incl. any-day chores', () => {
    expect(chartRows({ a: T({ offUntil: '2026-10-18' }), b: T({ id: 'b', freq: 'weekly', offUntil: '2026-10-18' }) }, ['Alice'], '2026-10-12')).toEqual([]);
    expect(chartRows({ b: T({ id: 'b', freq: 'weekly', offUntil: '2026-10-14' }) }, ['Alice'], '2026-10-12')).toHaveLength(1);
  });
});

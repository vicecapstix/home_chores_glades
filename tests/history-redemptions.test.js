import { describe, it, expect } from 'vitest';
import { historyEvents, redemptionEvents, historyHTML, HISTORY_LIMIT } from '../src/history.js';

const comp = (at, person = 'Alice', points = 2) => ({ taskId: 't' + at, taskName: 'Task ' + at, person, completedAt: at, points });
const red = (over = {}) => ({ id: 'r1', rewardName: 'Movie night', cost: 20, member: 'Alice', requestedAt: 2000, status: 'pending', ...over });

describe('redemptionEvents (#180)', () => {
  it('pending/approved request gives one -cost row', () => {
    const ev = redemptionEvents({ r1: red(), r2: red({ id: 'r2', status: 'approved', decidedAt: 2500 }) });
    expect(ev).toHaveLength(2);
    expect(ev.every(e => e.points === -20 && e.label.includes('Movie night') && e.label.includes('(requested)'))).toBe(true);
  });
  it('denied adds a +cost refund row at decidedAt', () => {
    const ev = redemptionEvents({ r1: red({ status: 'denied', decidedAt: 3000 }) });
    expect(ev).toHaveLength(2);
    const refund = ev.find(e => e.points === 20);
    expect(refund.completedAt).toBe(3000);
    expect(refund.label).toContain('(denied)');
  });
  it('tolerates missing data', () => {
    expect(redemptionEvents(undefined)).toEqual([]);
    expect(redemptionEvents({ x: null, y: { member: 'A' } })).toEqual([]);
  });
});

describe('historyEvents merge', () => {
  it('merges completions, bonuses and redemptions newest first', () => {
    const hist = [comp(1000), { type: 'bonus', person: 'Alice', reason: 'Helped', points: -3, completedAt: 4000 }];
    const ev = historyEvents(hist, { r1: red({ status: 'denied', decidedAt: 3000 }) });
    expect(ev.map(e => e.completedAt)).toEqual([4000, 3000, 2000, 1000]);
    expect(ev[0].label).toBe('Bonus: Helped');
    expect(ev[0].points).toBe(-3);
  });
  it('filters by member before capping', () => {
    const hist = Array.from({ length: 60 }, (_, i) => comp(10 + i, 'Alice'));
    const ev = historyEvents(hist, { r1: red({ member: 'Bob', requestedAt: 5 }) }, 'Bob');
    expect(ev).toHaveLength(1);
    expect(ev[0].person).toBe('Bob');
  });
  it('keeps the same 50-row limit across both sources', () => {
    const hist = Array.from({ length: 40 }, (_, i) => comp(100 + i));
    const reds = {};
    for (let i = 0; i < 30; i++) reds['r' + i] = red({ id: 'r' + i, requestedAt: 1000 + i });
    const ev = historyEvents(hist, reds);
    expect(HISTORY_LIMIT).toBe(50);
    expect(ev).toHaveLength(50);
    expect(ev[0].completedAt).toBe(1029);
  });
});

describe('historyHTML with redemptions', () => {
  it('renders signed rows with neg class and escapes reward names', () => {
    const html = historyHTML([comp(1000)], ['Alice'], '', { r1: red({ rewardName: '<img src=x onerror=1>', status: 'denied', decidedAt: 3000 }) });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('hist-pts neg">-20');
    expect(html).toContain('hist-pts">+20');
    expect(html).toContain('(requested)');
    expect(html).toContain('(denied)');
  });
  it('works without a redemptions argument (backwards compatible)', () => {
    expect(historyHTML([comp(1000)], ['Alice'], '')).toContain('Task 1000');
  });
});

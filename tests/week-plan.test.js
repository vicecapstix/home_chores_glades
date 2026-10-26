import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { weekPlan, setPauseUntil } from '../src/utils.js';
import { state } from '../src/state.js';
import { weekHTML } from '../src/week.js';

// Week of Mon 2026-10-12 .. Sun 2026-10-18; "now" is Wed 14th.
const at = (day, h = 12, mo = 9) => new Date(2026, mo, day, h, 0, 0).getTime();
const NOW = at(14);
const T = (o) => ({ id: 't' + Math.random(), name: 'Chore', freq: 'daily', person: '', done: false, lastDone: at(13), ...o });
const on = (plan, date) => plan.find(d => d.date === date).items.map(i => i.name);

beforeEach(() => setPauseUntil(''));
afterEach(() => setPauseUntil(''));

describe('weekPlan', () => {
  it('returns Mon..Sun with today flagged', () => {
    const p = weekPlan({}, NOW);
    expect(p.map(d => d.date)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
    expect(p.map(d => d.dow)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(p.filter(d => d.isToday).map(d => d.date)).toEqual(['2026-10-14']);
  });
  it('week boundary: Sunday belongs to the week that started the previous Monday', () => {
    const p = weekPlan({}, at(18, 23));
    expect(p[0].date).toBe('2026-10-12');
    expect(p[6].isToday).toBe(true);
    expect(weekPlan({}, at(19, 0))[0].date).toBe('2026-10-19');
  });
  it('daily appears every day', () => {
    const p = weekPlan({ a: T({ name: 'Dishes' }) }, NOW);
    expect(p.every(d => d.items.length === 1)).toBe(true);
  });
  it('weekdays appear only on their days', () => {
    const p = weekPlan({ a: T({ name: 'Bins', freq: 'weekdays', days: [2, 0] }) }, NOW);
    expect(p.filter(d => d.items.length).map(d => d.date)).toEqual(['2026-10-13', '2026-10-18']);
  });
  it('weekly appears once, on next due date', () => {
    const p = weekPlan({ a: T({ name: 'Vac', freq: 'weekly', lastDone: at(11) }) }, NOW);
    expect(p.filter(d => d.items.length).map(d => d.date)).toEqual(['2026-10-18']);
  });
  it('overdue weekly/fortnightly sit on today; far-future ones are absent', () => {
    const p = weekPlan({
      a: T({ name: 'Old', freq: 'weekly', lastDone: at(1) }),
      b: T({ name: 'Far', freq: 'fortnightly', lastDone: at(13) }),
    }, NOW);
    expect(on(p, '2026-10-14')).toEqual(['Old']);
    expect(p.flatMap(d => d.items).map(i => i.name)).not.toContain('Far');
  });
  it('fortnightly and interval land on their due date', () => {
    const p = weekPlan({
      a: T({ name: 'Fort', freq: 'fortnightly', lastDone: at(5) }),
      b: T({ name: 'Every3', freq: 'interval', intervalDays: 3, lastDone: at(13) }),
    }, NOW);
    expect(p.flatMap(d => d.items).map(i => i.name)).toEqual(['Every3']); // Fort is due next week
    expect(on(p, '2026-10-16')).toEqual(['Every3']);
  });
  it('monthly follows the calendar', () => {
    const p = weekPlan({ a: T({ name: 'Mo', freq: 'monthly', lastDone: new Date(2026, 8, 16, 12).getTime() }) }, NOW);
    expect(on(p, '2026-10-16')).toEqual(['Mo']);
  });
  it('one-offs go on dueDate; overdue on today; done and far ones omitted', () => {
    const p = weekPlan({
      a: T({ name: 'Fri', freq: 'once', dueDate: '2026-10-16' }),
      b: T({ name: 'Late', freq: 'once', dueDate: '2026-10-01' }),
      c: T({ name: 'Done', freq: 'once', dueDate: '2026-10-16', done: true }),
      d: T({ name: 'Next', freq: 'once', dueDate: '2026-10-25' }),
      e: T({ name: 'NoDate', freq: 'once' }),
    }, NOW);
    expect(on(p, '2026-10-16')).toEqual(['Fri']);
    expect(on(p, '2026-10-14')).toEqual(['Late']);
    expect(p.flatMap(d => d.items)).toHaveLength(2);
  });
  it('carries assignee and due time, sorted by time then name', () => {
    const p = weekPlan({
      a: T({ name: 'B', freq: 'once', dueDate: '2026-10-14', person: 'Bo', dueTime: '18:00' }),
      b: T({ name: 'A', freq: 'once', dueDate: '2026-10-14', dueTime: '07:30' }),
      c: T({ name: 'C', freq: 'once', dueDate: '2026-10-14', dueTime: 'bad' }),
    }, NOW);
    const items = p[2].items;
    expect(items.map(i => i.name)).toEqual(['A', 'B', 'C']);
    expect(items[1]).toMatchObject({ person: 'Bo', dueTime: '18:00' });
    expect(items[2].dueTime).toBe('');
  });
  it('marks a chore done today only on today', () => {
    const p = weekPlan({ a: T({ freq: 'daily', done: true, lastDone: at(14, 8) }) }, NOW);
    expect(p.map(d => d.items[0].done)).toEqual([false, false, true, false, false, false, false]);
  });
  it('pause empties paused days from today through the end date', () => {
    setPauseUntil('2026-10-15');
    const p = weekPlan({ a: T({ name: 'D' }) }, NOW);
    expect(p.map(d => d.paused)).toEqual([false, false, true, true, false, false, false]);
    expect(p[2].items).toEqual([]);
    expect(p[4].items).toHaveLength(1);
  });
});

describe('weekHTML', () => {
  it('escapes user data, highlights today and writes nothing', () => {
    state.members = { Bo: { name: 'Bo', role: 'member', avatar: '🦁' } };
    const html = weekHTML({ a: T({ name: '<img src=x onerror=1>', freq: 'once', dueDate: '2026-10-14', person: 'Bo', dueTime: '09:00' }) }, NOW);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('wk-today');
    expect(html).toContain('09:00');
    expect(html).toContain('🦁 Bo');
    expect(html).toContain('Nothing due');
  });
});

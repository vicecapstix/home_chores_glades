import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let P, state;
const WEEK = '2026-10-19'; // a Monday
const t = (over) => ({ id: 'a', name: 'Chore', freq: 'daily', person: 'Alice', ...over });

beforeEach(async () => {
  vi.resetModules();
  state = (await import('../src/state.js')).state;
  P = await import('../src/printchart.js');
  state.members = { Alice: { name: 'Alice', role: 'admin' }, Bob: { name: 'Bob', role: 'member' } };
  state.tasks = {};
  document.body.innerHTML = '<div id="print-chart"></div>';
});

describe('weekDates / dueDays', () => {
  it('lists Mon..Sun across a month boundary', () => {
    expect(P.weekDates('2026-10-26')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
  });
  it('daily is due every day', () => {
    expect(P.dueDays(t(), P.weekDates(WEEK)).days.every(Boolean)).toBe(true);
  });
  it('weekdays maps Sun=0 to the last column and Mon=1 to the first', () => {
    const r = P.dueDays(t({ freq: 'weekdays', days: [1, 3, 0] }), P.weekDates(WEEK));
    expect(r.days).toEqual([true, false, true, false, false, false, true]);
    expect(r.anyDay).toBe(false);
  });
  it('once is due only on its date, and only if in the week', () => {
    expect(P.dueDays(t({ freq: 'once', dueDate: '2026-10-22' }), P.weekDates(WEEK)).days).toEqual([false, false, false, true, false, false, false]);
    expect(P.dueDays(t({ freq: 'once', dueDate: '2026-11-22' }), P.weekDates(WEEK)).days.some(Boolean)).toBe(false);
  });
  it('weekly/fortnightly/monthly/interval are any-day', () => {
    ['weekly', 'fortnightly', 'monthly', 'interval'].forEach(f => expect(P.dueDays(t({ freq: f }), P.weekDates(WEEK)).anyDay).toBe(true));
  });
});

describe('chartRows / chartHTML', () => {
  it('groups by member then Anyone and skips empty groups and out-of-week once tasks', () => {
    const tasks = {
      a: t({ id: 'a', name: 'Dishes', person: 'Alice' }),
      b: t({ id: 'b', name: 'Bins', person: '', freq: 'weekly' }),
      c: t({ id: 'c', name: 'Old', person: 'Bob', freq: 'once', dueDate: '2020-01-01' }),
    };
    const g = P.chartRows(tasks, ['Alice', 'Bob'], WEEK);
    expect(g.map(x => x.person)).toEqual(['Alice', '']);
  });
  it('escapes user text', () => {
    const html = P.chartHTML({ a: t({ name: '<img src=x onerror=1>', person: '<b>Al</b>' }) }, ['<b>Al</b>'], WEEK);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>Al');
    expect(html).toContain('&lt;img');
  });
  it('renders title, week dates, 7 day headers and boxes on due days', () => {
    const html = P.chartHTML({ a: t({ freq: 'weekdays', days: [1, 2] }) }, ['Alice'], WEEK);
    expect(html).toContain('FamilyFlow weekly chart');
    expect(html).toContain('Week of');
    P.CHART_DAYS.forEach(d => expect(html).toContain('>' + d + '<'));
    expect((html.match(/class="pc-box"/g) || []).length).toBe(2);
  });
  it('says so when nothing is scheduled', () => {
    expect(P.chartHTML({}, ['Alice'], WEEK)).toContain('No chores scheduled');
  });
});

describe('printChart guard', () => {
  it('admin fills the block and prints; non-admin does nothing', () => {
    window.print = vi.fn();
    state.tasks = { a: t({ name: 'Dishes' }) };
    P.printChart(() => false);
    expect(window.print).not.toHaveBeenCalled();
    P.printChart(() => true);
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.getElementById('print-chart').innerHTML).toContain('Dishes');
  });
});

describe('print CSS and markup', () => {
  const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
  const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
  it('has @media print hiding the app UI and landscape page', () => {
    expect(css).toMatch(/@media print\s*{[^]*body > \*:not\(#print-chart\)\s*{\s*display:\s*none !important/);
    expect(css).toMatch(/@page\s*{\s*size:\s*landscape/);
    expect(css).toMatch(/#print-chart\s*{\s*display:\s*none;\s*}/);
  });
  it('has the container and the admin Print chart button', () => {
    expect(html).toContain('id="print-chart"');
    expect(html).toContain('window.printChart()');
  });
});

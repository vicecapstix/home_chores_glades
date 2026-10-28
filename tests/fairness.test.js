import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { fairnessReport, fairnessHTML, openFairness } from '../src/fairness.js';

vi.mock('../src/modals.js', () => ({ openModal: vi.fn() }));
import { openModal } from '../src/modals.js';

const NOW = new Date(2026, 9, 28, 12, 0).getTime();
const DAY = 86400000;
const h = (person, points, daysAgo, taskId = 'c1', extra = {}) => ({ taskId, person, points, completedAt: NOW - daysAgo * DAY, ...extra });
const tasks = { c1: { id: 'c1', person: 'Al' }, any: { id: 'any', person: '' } };

describe('fairnessReport (#226)', () => {
  it('sums points and completions per member over the last 28 days only', () => {
    const rep = fairnessReport([h('Al', 3, 1), h('Al', 2, 27), h('Al', 50, 29), h('Bo', 4, 2)], tasks, ['Al', 'Bo'], NOW);
    expect(rep.rows.find(r => r.name === 'Al')).toMatchObject({ points: 5, count: 2 });
    expect(rep.rows.find(r => r.name === 'Bo')).toMatchObject({ points: 4, count: 1 });
  });
  it("counts 'Anyone' chores separately", () => {
    const rep = fairnessReport([h('Al', 3, 1, 'any'), h('Al', 3, 2, 'any'), h('Al', 3, 3)], tasks, ['Al'], NOW);
    expect(rep.rows[0]).toMatchObject({ count: 3, anyone: 2 });
  });
  it('flags members more than 30% above or below the family average', () => {
    const rep = fairnessReport([h('Al', 20, 1), h('Bo', 10, 1), h('Cy', 3, 1)], tasks, ['Al', 'Bo', 'Cy'], NOW); // avg 11
    const f = n => rep.rows.find(r => r.name === n).flag;
    expect(f('Al')).toBe('high');
    expect(f('Bo')).toBe('');
    expect(f('Cy')).toBe('low');
  });
  it('does not flag anyone when the average is 0, and handles an empty family', () => {
    expect(fairnessReport([], tasks, ['Al', 'Bo'], NOW).rows.every(r => r.flag === '')).toBe(true);
    expect(fairnessReport([], tasks, [], NOW).rows).toEqual([]);
  });
  it('ignores bonus/reward entries, removed members and future timestamps', () => {
    const rep = fairnessReport([h('Al', 10, 1, undefined, { type: 'bonus' }), h('Zed', 9, 1), h('Al', 5, -1)], tasks, ['Al'], NOW);
    expect(rep.rows[0]).toMatchObject({ points: 0, count: 0 });
  });
  it('marks the report partial only when the capped history does not reach back 28 days', () => {
    const full = Array.from({ length: 500 }, () => h('Al', 1, 5));
    expect(fairnessReport(full, tasks, ['Al'], NOW).partial).toBe(true);
    expect(fairnessReport([...full.slice(1), h('Al', 1, 40)], tasks, ['Al'], NOW).partial).toBe(false);
    expect(fairnessReport([h('Al', 1, 5)], tasks, ['Al'], NOW).partial).toBe(false);
  });
});

describe('fairnessHTML', () => {
  it('escapes member names and shows the flag tags', () => {
    const rep = { average: 5, partial: false, rows: [{ name: '<img src=x onerror=1>', points: 9, count: 1, anyone: 0, flag: 'high' }, { name: 'Bo', points: 1, count: 1, anyone: 1, flag: 'low' }] };
    const html = fairnessHTML(rep);
    expect(html).not.toContain('<img');
    expect(html).toContain('Doing a lot');
    expect(html).toContain('Doing less');
  });
  it('says so when there are no members', () => {
    expect(fairnessHTML({ rows: [], average: 0, partial: false })).toContain('No members');
  });
});

describe('openFairness is admin only', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.members = { Al: { name: 'Al' } }; state.tasks = tasks; state.history = [];
    document.body.innerHTML = '<div id="fairness-list"></div>';
  });
  it('opens for an admin and renders the list', () => {
    openFairness(() => true);
    expect(openModal).toHaveBeenCalledWith('fairness-modal');
    expect(document.getElementById('fairness-list').innerHTML).toContain('Al');
  });
  it('does nothing for a non-admin', () => {
    openFairness(() => false);
    expect(openModal).not.toHaveBeenCalled();
    expect(document.getElementById('fairness-list').innerHTML).toBe('');
  });
});

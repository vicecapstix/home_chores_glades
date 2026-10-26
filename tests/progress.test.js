import { describe, it, expect, beforeEach } from 'vitest';
import { memberWeeks } from '../src/utils.js';
import { state } from '../src/state.js';
import { progressHTML, openProgress } from '../src/progress.js';

// Now = Wed 2026-10-14. Weeks start Mon: 09-21, 10-05... => 09-21, 09-28, 10-05, 10-12.
const at = (mo, day, h = 12) => new Date(2026, mo, day, h, 0, 0).getTime();
const NOW = at(9, 14);
const e = (ts, over = {}) => ({ taskName: 'x', person: 'Bo', completedAt: ts, points: 2, ...over });

describe('memberWeeks', () => {
  it('returns 4 weeks oldest first, Monday start', () => {
    const w = memberWeeks([], 'Bo', NOW);
    expect(w.map(x => x.weekStart)).toEqual(['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']);
  });
  it('sums points and completions per week for the member only', () => {
    const h = [e(at(9, 12, 0)), e(at(9, 13), { points: 3 }), e(at(9, 5)), e(at(9, 13), { person: 'Al' })];
    const w = memberWeeks(h, 'Bo', NOW);
    expect(w[3]).toMatchObject({ points: 5, count: 2 });
    expect(w[2]).toMatchObject({ points: 2, count: 1 });
  });
  it('week boundaries: Sunday 23:59 is the old week, Monday 00:00 the new one', () => {
    const h = [e(new Date(2026, 9, 11, 23, 59).getTime()), e(new Date(2026, 9, 12, 0, 0).getTime())];
    const w = memberWeeks(h, 'Bo', NOW);
    expect(w[2].count).toBe(1);
    expect(w[3].count).toBe(1);
  });
  it('bonus entries count in points only; deductions subtract', () => {
    const h = [e(at(9, 13)), e(at(9, 13), { type: 'bonus', points: 10 }), e(at(9, 13), { type: 'bonus', points: -4 })];
    expect(memberWeeks(h, 'Bo', NOW)[3]).toMatchObject({ points: 8, count: 1 });
  });
  it('empty weeks are zero and not partial', () => {
    const w = memberWeeks([e(at(9, 13))], 'Bo', NOW);
    expect(w.slice(0, 3)).toEqual([0, 1, 2].map(i => ({ weekStart: w[i].weekStart, points: 0, count: 0, partial: false })));
  });
  it('flags weeks older than the oldest entry as partial only when history is at the cap', () => {
    const full = Array.from({ length: 500 }, (_, i) => e(at(9, 6) + i * 1000)); // oldest in week of 10-05
    const w = memberWeeks(full, 'Bo', NOW);
    expect(w.map(x => x.partial)).toEqual([true, true, true, false]);
    expect(memberWeeks(full.slice(0, 499), 'Bo', NOW).some(x => x.partial)).toBe(false);
  });
});

describe('progress modal', () => {
  beforeEach(() => {
    state.history = [e(at(9, 13))];
    document.body.innerHTML = '<div id="progress-modal" class="hidden"><span id="progress-title"></span><div id="progress-list"></div></div>';
  });
  it('writes values as text and escapes the name', () => {
    const html = progressHTML(state.history, '<b>x</b>', NOW);
    expect(html).toContain('0 pts, 0 chores');
    expect(html).toContain('This week');
    expect(html).not.toContain('<b>x');
    expect(progressHTML(state.history, 'Bo', NOW)).toContain('2 pts, 1 chore<');
  });
  it('shows a partial note when the cap truncates', () => {
    const h = Array.from({ length: 500 }, (_, i) => e(at(9, 6) + i * 1000));
    const html = progressHTML(h, 'Bo', NOW);
    expect(html).toContain('(partial)');
    expect(html).toContain('capped');
  });
  it('members open only their own; admins any', () => {
    openProgress('Al', () => false, () => 'Bo');
    expect(document.getElementById('progress-modal').classList.contains('hidden')).toBe(true);
    openProgress('Bo', () => false, () => 'Bo');
    expect(document.getElementById('progress-modal').classList.contains('hidden')).toBe(false);
    document.getElementById('progress-modal').classList.add('hidden');
    openProgress('Al', () => true, () => 'Bo');
    expect(document.getElementById('progress-title').textContent).toContain('Al');
  });
});

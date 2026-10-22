import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchPaths: vi.fn(), patchRoot: vi.fn() }));
import { weekRecap, lastWeekChampion, prevWeekStart } from '../src/utils.js';
import { lastWeekHTML, setLbTab, openLeaderboard } from '../src/ui.js';
import { tvStripHTML, tvChampionHTML } from '../src/tv.js';

const at = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const e = (person, ts, points) => ({ taskId: 't', taskName: 'x', person, completedAt: ts, points });
// "Now" is Wed 21 Oct 2026, so last week = Mon 12 Oct .. Sun 18 Oct 2026.
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 21, 10, 0)); state.members = {}; state.history = []; });
afterEach(() => vi.useRealTimers());

describe('weekRecap', () => {
  it('prevWeekStart is the local Monday a week earlier', () => {
    expect(prevWeekStart()).toBe('2026-10-12');
  });
  it('respects local Monday boundaries', () => {
    const h = [e('A', at(2026, 10, 11, 23, 59), 5), e('A', at(2026, 10, 12, 0, 0), 3), e('A', at(2026, 10, 18, 23, 59), 2), e('A', at(2026, 10, 19, 0, 0), 9)];
    expect(weekRecap(h, '2026-10-12')).toEqual([{ name: 'A', points: 5, count: 2 }]);
  });
  it('sums per member, sorts by points and omits empty members', () => {
    const h = [e('B', at(2026, 10, 13), 2), e('A', at(2026, 10, 14), 4), e('B', at(2026, 10, 15), 3), e('C', at(2026, 10, 1), 9)];
    expect(weekRecap(h, '2026-10-12').map(r => [r.name, r.points, r.count])).toEqual([['B', 5, 2], ['A', 4, 1]]);
  });
  it('empty or missing history gives no rows', () => {
    expect(weekRecap([], '2026-10-12')).toEqual([]);
    expect(weekRecap(undefined, '2026-10-12')).toEqual([]);
  });
});

describe('lastWeekChampion', () => {
  it('shares the title on a tie', () => {
    const c = lastWeekChampion([e('A', at(2026, 10, 13), 4), e('B', at(2026, 10, 14), 4)]);
    expect(c.names).toEqual(['A', 'B']);
    expect(c.points).toBe(4);
  });
  it('has no champion for an empty week', () => {
    expect(lastWeekChampion([e('A', at(2026, 10, 20), 4)]).names).toEqual([]);
  });
  it('flags truncation only when history is at the cap and starts after the week', () => {
    const full = Array.from({ length: 500 }, (_, i) => e('A', at(2026, 10, 12, 0, 0) + i, 1));
    expect(lastWeekChampion(full).truncated).toBe(false); // history reaches into that week
    const recent = Array.from({ length: 500 }, (_, i) => e('A', at(2026, 10, 19) + i, 1));
    expect(lastWeekChampion(recent).truncated).toBe(true);
    expect(lastWeekChampion([e('A', at(2026, 10, 19), 1)]).truncated).toBe(false);
  });
});

describe('leaderboard Last week tab', () => {
  beforeEach(() => {
    state.members = { A: { name: 'A' }, B: { name: 'B' }, C: { name: 'C' } };
    document.body.innerHTML = '<div id="lb-list"></div><div id="leaderboard-modal" class="hidden"><button class="lb-tab active" id="t1"></button><button class="lb-tab" id="t2"></button></div>';
  });
  it('shares rank on ties and escapes names', () => {
    state.members['<b>x</b>'] = { name: '<b>x</b>' };
    state.history = [e('A', at(2026, 10, 13), 4), e('<b>x</b>', at(2026, 10, 14), 4), e('B', at(2026, 10, 15), 1)];
    const html = lastWeekHTML();
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect((html.match(/lb-rank">1</g) || []).length).toBe(2);
    expect(html).toContain('lb-rank">3<');
  });
  it('shows an empty message when nothing was done', () => {
    expect(lastWeekHTML()).toMatch(/No chores were completed last week/);
  });
  it('setLbTab("lastweek") renders into #lb-list', () => {
    state.history = [e('A', at(2026, 10, 13), 4)];
    openLeaderboard();
    setLbTab('lastweek', document.getElementById('t2'));
    expect(document.getElementById('lb-list').textContent).toContain('4 pts');
    setLbTab('alltime', document.getElementById('t1'));
  });
  it('notes truncated data', () => {
    state.history = Array.from({ length: 500 }, (_, i) => e('A', at(2026, 10, 19) + i, 1));
    state.history[0] = e('A', at(2026, 10, 13), 2); // one entry last week, but oldest is not before week start
    expect(lastWeekHTML()).toMatch(/may be incomplete/);
  });
});

describe('TV champion line', () => {
  it('shows winners with points, escaped', () => {
    const h = [e('A', at(2026, 10, 13), 4), e('<i>', at(2026, 10, 14), 4)];
    const html = tvChampionHTML(h);
    expect(html).toContain('🏆 Last week: &lt;i&gt; & A');
    expect(html).toContain('&lt;i&gt;');
    expect(html).toContain('4 pts');
  });
  it('is empty with no winner and leaves the strip unchanged', () => {
    expect(tvChampionHTML([])).toBe('');
    expect(tvStripHTML({}, [])).toBe('');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn(),
  adjustMemberPoints: vi.fn(), appendHistory: vi.fn(), patchPaths: vi.fn(),
}));
import { state } from '../src/state.js';
import { render, initRender } from '../src/render.js';
import { leaderboardHTML } from '../src/ui.js';
import { tvStripHTML, tvChampionHTML } from '../src/tv.js';
import { weekRecap, currentWeekPoints, getWeekStart, prevWeekStart } from '../src/utils.js';

// #247: points read from the database are rendered as numbers, never as markup.
const EVIL = '<img src=x onerror=alert(1)>';
const lastWeekTs = () => {
  const [y, m, d] = prevWeekStart().split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
};

beforeEach(() => {
  document.body.innerHTML = ['h-total', 'h-done', 'h-overdue', 'h-pct'].map(i => '<span id="' + i + '"></span>').join('') +
    '<div id="prog"></div><div id="member-chips"></div><select id="new-person"></select><div id="filters"></div><div id="task-list"></div>';
  state.tasks = {};
  state.members = { Al: { name: 'Al', role: 'member', points: EVIL, weekPoints: EVIL, weekStart: getWeekStart() } };
  state.history = [
    { taskId: 't', taskName: 'x', person: 'Al', completedAt: lastWeekTs(), points: EVIL },
    { taskId: 't', taskName: 'x', person: 'Al', completedAt: lastWeekTs(), points: 2 },
  ];
  initRender(() => true, () => 'Al');
});

describe('points from the database are not rendered as markup (#247)', () => {
  it('weekRecap sums numerically and ignores a string points value', () => {
    const rows = weekRecap(state.history, prevWeekStart());
    expect(rows[0].points).toBe(2);
    expect(typeof rows[0].points).toBe('number');
  });
  it('currentWeekPoints coerces a string weekPoints to 0', () => {
    expect(currentWeekPoints(state.members.Al)).toBe(0);
  });
  it('leaderboard tabs render no markup', () => {
    ['alltime', 'week', 'lastweek'].forEach(tab => expect(leaderboardHTML(tab)).not.toContain('<img'));
  });
  it('member chips render no markup', () => {
    render();
    expect(document.getElementById('member-chips').innerHTML).not.toContain('<img');
  });
  it('TV strip and champion render no markup', () => {
    expect(tvStripHTML(state.members, state.history, {})).not.toContain('<img');
    expect(tvChampionHTML(state.history)).not.toContain('<img');
  });
  it('normal numeric display is unchanged', () => {
    state.members.Al.points = 12; state.members.Al.weekPoints = 7;
    state.history = [{ taskId: 't', taskName: 'x', person: 'Al', completedAt: lastWeekTs(), points: 5 }];
    expect(leaderboardHTML('alltime')).toContain('12 pts');
    expect(leaderboardHTML('week')).toContain('7 pts');
    expect(leaderboardHTML('lastweek')).toContain('5 pts');
    render();
    expect(document.getElementById('member-chips').innerHTML).toContain('>12<');
  });
});

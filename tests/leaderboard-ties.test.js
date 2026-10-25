import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import * as ui from '../src/ui.js';

const mem = (name, points, weekPoints) => ({ name, role: 'member', points, weekPoints, weekStart: '' });
const rows = () => [...document.querySelectorAll('#lb-list .lb-row')].map(r => [
  r.querySelector('.lb-rank').textContent, r.querySelector('.lb-name').textContent.trim()]);

beforeEach(() => {
  document.body.innerHTML = '<div id="leaderboard-modal" class="hidden"><button id="t-all" class="lb-tab active"></button><button id="t-week" class="lb-tab"></button></div><div id="lb-list"></div>';
  state.history = [];
  state.members = { Zed: mem('Zed', 30, 5), Amy: mem('Amy', 30, 5), Bob: mem('Bob', 50, 5), Cat: mem('Cat', 10, 5) };
});

describe('leaderboard ties (#170)', () => {
  it('all-time: equal points share a rank (1, 2, 2, 4), ties ordered by name', () => {
    ui.openLeaderboard();
    expect(rows()).toEqual([['1', 'Bob'], ['2', 'Amy'], ['2', 'Zed'], ['4', 'Cat']]);
  });
  it('this week: a four-way tie is all rank 1, ordered by name', () => {
    ui.setLbTab('week', document.getElementById('t-week'));
    expect(rows().map(r => r[0])).toEqual(['1', '1', '1', '1']);
    expect(rows().map(r => r[1])).toEqual(['Amy', 'Bob', 'Cat', 'Zed']);
  });
  it('a tie at the top gives 1, 1, 3', () => {
    state.members = { B: mem('B', 30, 0), A: mem('A', 30, 0), C: mem('C', 10, 0) };
    ui.setLbTab('alltime', document.getElementById('t-all'));
    expect(rows()).toEqual([['1', 'A'], ['1', 'B'], ['3', 'C']]);
  });
});

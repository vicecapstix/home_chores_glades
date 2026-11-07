import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { PCOLS } from '../src/config.js';
import { weekHTML } from '../src/week.js';

const NOW = new Date(2026, 9, 14, 12, 0, 0).getTime();
const task = (id, person) => ({ id, name: 'Chore ' + person, freq: 'daily', person, done: false, lastDone: new Date(2026, 9, 13, 12).getTime() });

// First <li> whose text mentions the member -> the colour style on its chip.
const chipStyle = (html, name) => {
  const m = html.match(new RegExp('<span class="lb-name wk-who" style="([^"]*)">' + name + '</span>'));
  return m && m[1];
};

beforeEach(() => { state.members = {}; state.tasks = {}; });

describe('This week planner uses stable member colours (#252)', () => {
  it('uses the stored colorIdx, not the list position', () => {
    state.members = { Amy: { name: 'Amy', role: 'admin', colorIdx: 2 }, Ben: { name: 'Ben', role: 'member', colorIdx: 0 } };
    const html = weekHTML({ a: task('a', 'Amy'), b: task('b', 'Ben') }, NOW);
    expect(chipStyle(html, 'Amy')).toBe('background:' + PCOLS[2].bg + ';color:' + PCOLS[2].text);
    expect(chipStyle(html, 'Ben')).toBe('background:' + PCOLS[0].bg + ';color:' + PCOLS[0].text);
  });
  it('colours stay put after an earlier member is removed', () => {
    state.members = { Cleo: { name: 'Cleo', role: 'member', colorIdx: 3 } };
    const html = weekHTML({ c: task('c', 'Cleo') }, NOW);
    expect(chipStyle(html, 'Cleo')).toBe('background:' + PCOLS[3].bg + ';color:' + PCOLS[3].text);
  });
  it('unknown or Anyone chips keep the muted fallback', () => {
    const html = weekHTML({ x: task('x', ''), y: task('y', 'Gone') }, NOW);
    expect(chipStyle(html, 'Anyone')).toBe('background:var(--bg);color:var(--muted)');
    expect(chipStyle(html, 'Gone')).toBe('background:var(--bg);color:var(--muted)');
  });
});

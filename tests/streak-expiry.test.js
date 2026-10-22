import { describe, it, expect } from 'vitest';
import { currentStreak, localDateStr } from '../src/utils.js';
import { tvStripHTML } from '../src/tv.js';

const now = new Date(2026, 4, 13, 12, 0, 0).getTime();
const m = (d) => ({ name: 'A', streak: 20, lastStreakDate: d });

describe('currentStreak', () => {
  it('counts when last completion is today', () => expect(currentStreak(m('2026-05-13'), now)).toBe(20));
  it('counts when last completion is yesterday', () => expect(currentStreak(m('2026-05-12'), now)).toBe(20));
  it('expires after 2 days', () => expect(currentStreak(m('2026-05-11'), now)).toBe(0));
  it('is 0 with missing date', () => expect(currentStreak({ streak: 5 }, now)).toBe(0));
  it('is 0 for missing member or streak', () => {
    expect(currentStreak(undefined, now)).toBe(0);
    expect(currentStreak({ lastStreakDate: '2026-05-13' }, now)).toBe(0);
  });
  it('does not mutate stored streak', () => {
    const x = m('2026-01-01'); currentStreak(x, now); expect(x.streak).toBe(20);
  });
});

describe('TV strip', () => {
  it('hides a stale streak flame', () => {
    expect(tvStripHTML({ A: m('2020-01-01') }, [])).not.toContain('🔥');
  });
  it('shows a live streak flame', () => {
    expect(tvStripHTML({ A: m(localDateStr()) }, [])).toContain('🔥20');
  });
});

import { describe, it, expect } from 'vitest';
import { teamGoalProgress } from '../src/teamgoal.js';

const NOW = new Date(2026, 9, 14, 12, 0).getTime(); // Wed 14 Oct 2026
const h = (points, person, extra = {}) => ({ completedAt: NOW - 3600000, points, person, ...extra });
const ded = (points, person) => h(points, person, { type: 'bonus', taskName: 'Bonus: x' });

describe('team goal counts deductions of members with no completions (#351)', () => {
  it('Amy +20 and Ben -5 (deduction only) = 15', () => {
    expect(teamGoalProgress([h(20, 'Amy'), ded(-5, 'Ben')], { points: 100 }, NOW).earned).toBe(15);
  });
  it('same total once Ben also has a completion', () => {
    expect(teamGoalProgress([h(20, 'Amy'), ded(-5, 'Ben'), h(0, 'Ben')], { points: 100 }, NOW).earned).toBe(15);
  });
  it('never below 0', () => {
    expect(teamGoalProgress([ded(-5, 'Ben')], { points: 100 }, NOW)).toMatchObject({ earned: 0, pct: 0 });
  });
});

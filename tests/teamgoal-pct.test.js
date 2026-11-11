import { describe, it, expect } from 'vitest';
import { teamGoalProgress } from '../src/teamgoal.js';

const NOW = new Date(2026, 9, 14, 12, 0).getTime();
const hist = pts => [{ person: 'Al', points: pts, completedAt: NOW }];

describe('team goal percentage (#327)', () => {
  it('is not 100 until the goal is reached', () => {
    const p = teamGoalProgress(hist(199), { points: 200 }, NOW);
    expect(p.reached).toBe(false);
    expect(p.pct).toBe(99);
  });
  it('is exactly 100 once reached, and stays capped when exceeded', () => {
    expect(teamGoalProgress(hist(200), { points: 200 }, NOW).pct).toBe(100);
    expect(teamGoalProgress(hist(250), { points: 200 }, NOW).pct).toBe(100);
  });
  it('is 0 with no goal set', () => {
    expect(teamGoalProgress(hist(50), null, NOW).pct).toBe(0);
  });
});

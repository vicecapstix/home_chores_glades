import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state, applySnapshot } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ patchRoot: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import * as fb from '../src/firebase.js';
import { validTeamGoal, teamGoalProgress, renderTeamGoal, setTeamGoal, clearTeamGoal, teamGoalAdminHTML, shouldCelebrateTeam } from '../src/teamgoal.js';

const NOW = new Date(2026, 9, 14, 12, 0).getTime(); // Wed 14 Oct 2026
const mon = new Date(2026, 9, 12, 0, 0).getTime();   // this week's Monday 00:00
const admin = () => true, member = () => false;
const h = (completedAt, points, person = 'Al') => ({ completedAt, points, person });

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW); localStorage.clear();
  state.teamGoal = null; state.history = [];
  document.body.innerHTML = '<div id="team-goal" class="hidden" role="progressbar"><span id="team-goal-text"></span><div id="team-goal-fill"></div></div><div id="toast" role="status"></div>';
});
afterEach(() => vi.useRealTimers());

describe('progress maths', () => {
  it('sums all members points this week', () => {
    const hist = [h(NOW, 3), h(NOW - 3600000, 5, 'Bo'), h(mon, 2)];
    expect(teamGoalProgress(hist, { points: 20 }, NOW)).toEqual({ earned: 10, target: 20, reached: false, pct: 50 });
  });
  it('week boundary: Monday 00:00 in, last Sunday 23:59 out', () => {
    const hist = [h(mon, 4), h(mon - 1, 100)];
    expect(teamGoalProgress(hist, { points: 10 }, NOW).earned).toBe(4);
  });
  it('Sunday still belongs to the week that started the Monday before', () => {
    const sun = new Date(2026, 9, 18, 22, 0).getTime();
    expect(teamGoalProgress([h(mon, 4)], { points: 10 }, sun).earned).toBe(4);
  });
  it('caps pct at 100 and flags reached', () => {
    expect(teamGoalProgress([h(NOW, 50)], { points: 20 }, NOW)).toMatchObject({ reached: true, pct: 100, earned: 50 });
  });
  it('no goal means target 0', () => {
    expect(teamGoalProgress([h(NOW, 5)], null, NOW)).toMatchObject({ target: 0, reached: false, pct: 0 });
  });
});

describe('validation', () => {
  it('accepts 10-2000 and a reward up to 40 chars', () => {
    expect(validTeamGoal(10, ' Pizza ')).toEqual({ points: 10, reward: 'Pizza' });
    expect(validTeamGoal('2000', 'x'.repeat(40))).toBeTruthy();
  });
  it('rejects out of range, non-integer, empty or long reward', () => {
    [[9, 'a'], [2001, 'a'], [10.5, 'a'], ['abc', 'a'], [50, ''], [50, '   '], [50, 'x'.repeat(41)]].forEach(([p, r]) => expect(validTeamGoal(p, r)).toBeNull());
  });
});

describe('set / clear / guards', () => {
  it('admin sets with one patchRoot', async () => {
    expect(await setTeamGoal('200', 'Pizza night', admin)).toBe(true);
    expect(fb.patchRoot).toHaveBeenCalledWith({ teamGoal: { points: 200, reward: 'Pizza night' } });
    expect(state.teamGoal.points).toBe(200);
  });
  it('admin clears with null', async () => {
    state.teamGoal = { points: 200, reward: 'x' };
    await clearTeamGoal(admin);
    expect(fb.patchRoot).toHaveBeenCalledWith({ teamGoal: null });
    expect(state.teamGoal).toBeNull();
  });
  it('member cannot set or clear; invalid is not written', async () => {
    await setTeamGoal(200, 'Pizza', member);
    await clearTeamGoal(member);
    await setTeamGoal(5, 'Pizza', admin);
    expect(fb.patchRoot).not.toHaveBeenCalled();
  });
  it('write failure leaves state untouched', async () => {
    fb.patchRoot.mockRejectedValueOnce(new Error('nope'));
    expect(await setTeamGoal(200, 'Pizza', admin)).toBe(false);
    expect(state.teamGoal).toBeNull();
  });
});

describe('readonly', () => {
  it('set and clear do nothing in READONLY mode', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
    vi.doMock('../src/firebase.js', () => ({ patchRoot: vi.fn() }));
    vi.doMock('../src/ui.js', () => ({ showToast: vi.fn() }));
    const m = await import('../src/teamgoal.js');
    const f = await import('../src/firebase.js');
    expect(await m.setTeamGoal(200, 'Pizza', admin)).toBe(false);
    expect(await m.clearTeamGoal(admin)).toBe(false);
    expect(f.patchRoot).not.toHaveBeenCalled();
    vi.doUnmock('../src/config.js');
  });
});

describe('rendering', () => {
  it('shows text and progressbar attributes', () => {
    renderTeamGoal({ points: 200, reward: 'Pizza night' }, [h(NOW, 140)], NOW);
    const el = document.getElementById('team-goal');
    expect(el.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('team-goal-text').textContent).toBe('🍕 Pizza night: 140 / 200');
    expect(el.getAttribute('aria-valuenow')).toBe('140');
    expect(el.getAttribute('aria-valuemax')).toBe('200');
    expect(document.getElementById('team-goal-fill').style.width).toBe('70%');
  });
  it('hidden when no goal', () => {
    renderTeamGoal(null, [], NOW);
    expect(document.getElementById('team-goal').classList.contains('hidden')).toBe(true);
  });
  it('reward text is never parsed as HTML', () => {
    renderTeamGoal({ points: 20, reward: '<img src=x onerror=alert(1)>' }, [], NOW);
    expect(document.getElementById('team-goal').querySelector('img')).toBeNull();
  });
  it('celebrates once per week per device', () => {
    const g = { points: 20, reward: 'Pizza' };
    const el = () => document.getElementById('team-goal');
    renderTeamGoal(g, [h(NOW, 25)], NOW);
    expect(el().classList.contains('celebrate')).toBe(true);
    expect(shouldCelebrateTeam(NOW)).toBe(false);
    el().classList.remove('celebrate');
    renderTeamGoal(g, [h(NOW, 25)], NOW);
    expect(el().classList.contains('celebrate')).toBe(false);
    expect(shouldCelebrateTeam(NOW + 7 * 86400000)).toBe(true); // next week
  });
  it('does not celebrate below target', () => {
    renderTeamGoal({ points: 20, reward: 'Pizza' }, [h(NOW, 5)], NOW);
    expect(document.getElementById('team-goal').classList.contains('celebrate')).toBe(false);
  });
});

describe('state + admin html', () => {
  it('applySnapshot loads and clears teamGoal', () => {
    applySnapshot({ teamGoal: { points: 100, reward: 'Movie' } });
    expect(state.teamGoal.reward).toBe('Movie');
    applySnapshot({});
    expect(state.teamGoal).toBeNull();
  });
  it('admin form escapes the reward', () => {
    state.teamGoal = { points: 20, reward: '"><script>x</script>' };
    expect(teamGoalAdminHTML()).not.toContain('<script>');
  });
});

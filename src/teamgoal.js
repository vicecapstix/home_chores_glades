// Family team goal (#174): a shared weekly points target with a reward.
// Progress is computed from the capped history (local Mon-Sun week), so there
// is no per-week storage. Stored as one tiny key: state/teamGoal {points, reward}.
import { state } from './state.js';
import { READONLY } from './config.js';
import { patchRoot } from './firebase.js';
import { writeBlocked } from './writegate.js';
import { showToast } from './ui.js';
import { esc, getWeekStart, weekRecap } from './utils.js';

export const TEAM_GOAL_MIN = 10;
export const TEAM_GOAL_MAX = 2000;
export const TEAM_GOAL_REWARD_MAX = 40;
const KEY = 'ff_teamgoal_week';

// Pure: validate/normalise a goal; returns null when invalid.
export function validTeamGoal(points, reward) {
  const p = Number(points);
  const r = String(reward == null ? '' : reward).trim();
  if (!Number.isInteger(p) || p < TEAM_GOAL_MIN || p > TEAM_GOAL_MAX) return null;
  if (!r || r.length > TEAM_GOAL_REWARD_MAX) return null;
  return { points: p, reward: r };
}

// Pure: points earned by everyone in the local week containing `now`.
export function teamGoalProgress(history, goal, now = Date.now()) {
  const total = weekRecap(history, getWeekStart(now)).reduce((s, r) => s + r.points, 0);
  const target = goal && goal.points > 0 ? goal.points : 0;
  const earned = Math.max(0, total);
  return { earned, target, reached: target > 0 && earned >= target, pct: target ? Math.min(100, Math.round(earned / target * 100)) : 0 };
}

export function shouldCelebrateTeam(now = Date.now()) {
  try { return localStorage.getItem(KEY) !== getWeekStart(now); } catch (e) { return true; }
}
export function markTeamCelebrated(now = Date.now()) {
  try { localStorage.setItem(KEY, getWeekStart(now)); } catch (e) { /* storage blocked */ }
}

export function renderTeamGoal(goal = state.teamGoal, history = state.history, now = Date.now()) {
  const el = document.getElementById('team-goal');
  if (!el) return;
  const g = goal && validTeamGoal(goal.points, goal.reward);
  el.classList.toggle('hidden', !g);
  if (!g) return;
  const { earned, target, reached, pct } = teamGoalProgress(history, g, now);
  const text = g.reward + ': ' + earned + ' / ' + target;
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', String(target));
  el.setAttribute('aria-valuenow', String(Math.min(earned, target)));
  el.setAttribute('aria-label', 'Family goal, ' + text);
  const label = document.getElementById('team-goal-text');
  if (label) label.textContent = '🍕 ' + text; // textContent: reward text is never parsed as HTML
  const fill = document.getElementById('team-goal-fill');
  if (fill) fill.style.width = pct + '%';
  el.classList.toggle('complete', reached);
  if (reached && shouldCelebrateTeam(now)) {
    markTeamCelebrated(now);
    el.classList.remove('celebrate');
    void el.offsetWidth; // restart the animation
    el.classList.add('celebrate');
    showToast('Family goal reached: ' + g.reward + '! 🎉');
  }
}

// Admin only.
export async function setTeamGoal(points, reward, isAdminFn) {
  if (READONLY || !isAdminFn()) return false;
  if (writeBlocked(showToast)) return false;
  const g = validTeamGoal(points, reward);
  if (!g) { showToast('Goal: ' + TEAM_GOAL_MIN + '-' + TEAM_GOAL_MAX + ' points and a reward up to ' + TEAM_GOAL_REWARD_MAX + ' characters'); return false; }
  try { await patchRoot({ teamGoal: g }); state.teamGoal = g; showToast('Family goal set'); return true; }
  catch (err) { showToast('Save failed: ' + (err.code || err.message)); return false; }
}

export async function clearTeamGoal(isAdminFn) {
  if (READONLY || !isAdminFn()) return false;
  if (writeBlocked(showToast)) return false;
  try { await patchRoot({ teamGoal: null }); state.teamGoal = null; showToast('Family goal cleared'); return true; }
  catch (err) { showToast('Save failed: ' + (err.code || err.message)); return false; }
}

export function teamGoalAdminHTML() {
  const g = state.teamGoal;
  return '<div class="pause-admin"><div><b>Family weekly goal</b></div>' +
    '<label for="tg-points" class="sr-only">Points target</label>' +
    '<input type="number" id="tg-points" min="' + TEAM_GOAL_MIN + '" max="' + TEAM_GOAL_MAX + '" placeholder="Points" value="' + esc(g ? g.points : '') + '" />' +
    '<label for="tg-reward" class="sr-only">Reward</label>' +
    '<input type="text" id="tg-reward" maxlength="' + TEAM_GOAL_REWARD_MAX + '" placeholder="Reward, e.g. Pizza night" value="' + esc(g ? g.reward : '') + '" />' +
    '<button class="btn-sm" onclick="window.setTeamGoal()">Set</button>' +
    (g ? '<button class="btn-sm" onclick="window.clearTeamGoal()">Clear</button>' : '') + '</div>';
}

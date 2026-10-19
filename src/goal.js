// Family daily goal bar + once-per-day celebration. Display only: no Firebase access.
import { todayProgress, localDateStr } from './utils.js';
import { showToast } from './ui.js';

const KEY = 'ff_goal_day';
let _prev = null; // last { done, total } seen this session

export function shouldCelebrate(now = Date.now()) {
  try { return localStorage.getItem(KEY) !== localDateStr(new Date(now)); } catch (e) { return true; }
}

export function markCelebrated(now = Date.now()) {
  try { localStorage.setItem(KEY, localDateStr(new Date(now))); } catch (e) { /* storage blocked */ }
}

export function _resetGoal() { _prev = null; }

export function renderGoal(tasks, now = Date.now()) {
  const el = document.getElementById('goal');
  if (!el) return;
  const { done, total } = todayProgress(tasks, now);
  el.classList.toggle('hidden', total === 0);
  if (total === 0) { _prev = null; return; }
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', String(total));
  el.setAttribute('aria-valuenow', String(done));
  const text = 'Today: ' + done + ' of ' + total + ' chores done';
  el.setAttribute('aria-label', text);
  const label = document.getElementById('goal-text');
  if (label) label.textContent = text;
  const fill = document.getElementById('goal-fill');
  if (fill) fill.style.width = Math.round(done / total * 100) + '%';
  const complete = done === total;
  el.classList.toggle('complete', complete);
  if (complete && _prev && _prev.done < _prev.total && shouldCelebrate(now)) {
    markCelebrated(now);
    el.classList.remove('celebrate');
    void el.offsetWidth; // restart the animation
    el.classList.add('celebrate');
    showToast("All of today's chores are done! 🎉");
  }
  _prev = { done, total };
}

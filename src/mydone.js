// "All done for today!" for a member's own chores (#317). Display only: no Firebase access.
// Shown once per local day per member on this device when their last chore due today is ticked.
import { READONLY } from './config.js';
import { todayProgress, localDateStr } from './utils.js';

const KEY = 'ff_mydone_day:';
let _prev = null; // last { me, done, total } seen this session

function seenToday(me, now) {
  try { return localStorage.getItem(KEY + me) === localDateStr(new Date(now)); } catch (e) { return false; }
}
function markSeen(me, now) {
  try { localStorage.setItem(KEY + me, localDateStr(new Date(now))); } catch (e) { /* storage blocked */ }
}

export function _resetMyDone() { _prev = null; }

export function hideMyDone() {
  const el = document.getElementById('my-done');
  if (el) el.classList.add('hidden');
}

export function renderMyDone(tasks, me, isAdminFn, now = Date.now()) {
  if (READONLY || !me || isAdminFn()) { _prev = null; hideMyDone(); return; }
  const mine = Object.values(tasks || {}).filter(t => t && t.person === me);
  const { done, total } = todayProgress(mine, now);
  const complete = total > 0 && done === total;
  if (complete && _prev && _prev.me === me && _prev.done < _prev.total && !seenToday(me, now)) {
    markSeen(me, now);
    const el = document.getElementById('my-done');
    if (el) {
      const msg = document.getElementById('my-done-text');
      if (msg) msg.textContent = 'All done for today, ' + me + '! 🌟';
      el.classList.remove('hidden');
    }
  }
  if (!complete) hideMyDone();
  _prev = { me, done, total };
}

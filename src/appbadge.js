// App icon badge (#399): the number of my chores still due today, via the browser Badging API
// (installed PWA). Display only: no Firebase access, nothing stored, silent where unsupported.
import { READONLY } from './config.js';
import { todayProgress } from './utils.js';

let last = null; // last value sent, so an unchanged render does not call the API again

// Chores assigned to `me` that are overdue or due today and not done (same rule as the My done banner).
export function remainingToday(tasks, me, now = Date.now()) {
  if (!me) return 0;
  const { done, total } = todayProgress(Object.values(tasks || {}).filter(t => t && t.person === me), now);
  return Math.max(0, total - done);
}

export function updateAppBadge(tasks, me, now = Date.now(), nav = typeof navigator !== 'undefined' ? navigator : {}) {
  if (READONLY || typeof nav.setAppBadge !== 'function') return;
  const n = remainingToday(tasks, me, now);
  if (n === last) return;
  last = n;
  try {
    const p = n > 0 ? nav.setAppBadge(n) : typeof nav.clearAppBadge === 'function' ? nav.clearAppBadge() : nav.setAppBadge(0);
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (e) { /* unsupported or blocked: skip silently */ }
}

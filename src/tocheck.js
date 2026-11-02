// Parent check (#239): "To check" list for admins. Display only; the buttons reuse the #238 actions
// (window.approveCheck / window.sendBackCheck), which own the guards and the atomic take.
import { state } from './state.js';
import { READONLY } from './config.js';
import { openModal } from './modals.js';
import { esc, jsq, avatarPrefix, taskPoints } from './utils.js';
import { activeMultiplier } from './doublepoints.js';
import { runToCheckNotify } from './notifications.js';

let adminFn = () => false;

// Chores whose tick is waiting for a parent, oldest request first.
export function waitingChecks(tasks = state.tasks) {
  return Object.values(tasks || {})
    .filter(t => t && !t.done && t.checkPending && t.checkPending.by)
    .sort((a, b) => (a.checkPending.at || 0) - (b.checkPending.at || 0) || String(a.id).localeCompare(String(b.id)));
}

function whenLabel(ts) {
  return ts ? new Date(ts).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
}

export function toCheckHTML(tasks = state.tasks) {
  const list = waitingChecks(tasks);
  if (!list.length) return '<div class="empty">Nothing is waiting for a check.</div>';
  return '<ul class="tc-list">' + list.map(t => {
    const p = t.checkPending;
    const pts = taskPoints(t) * activeMultiplier(state.doublePoints, new Date(p.at || Date.now()));
    const who = avatarPrefix(state.members[p.by]) + p.by;
    const id = jsq(t.id), nm = esc(t.name);
    return '<li class="tc-row"><div class="tc-info"><span class="tc-name">' + nm + '</span>' +
      '<span class="tc-meta">' + esc(who) + ' · ' + esc(whenLabel(p.at)) + ' · +' + pts + ' pts</span></div>' +
      '<div class="tc-actions">' +
      '<button class="btn-sm btn-accent" aria-label="Looks good: ' + nm + '" onclick="window.approveCheck(\'' + id + '\')">Looks good</button>' +
      '<button class="btn-sm" aria-label="Not yet: ' + nm + '" onclick="window.sendBackCheck(\'' + id + '\')">Not yet</button></div></li>';
  }).join('') + '</ul>';
}

function renderToCheck() {
  const el = document.getElementById('tocheck-list');
  if (el) el.innerHTML = toCheckHTML();
}

// Count on the header button: admins only, never on the TV, hidden at 0.
export function updateToCheckBadge() {
  const b = document.getElementById('btn-tocheck');
  if (!b) return 0;
  const n = !READONLY && adminFn() ? waitingChecks().length : 0;
  const c = document.getElementById('tocheck-count');
  if (c) c.textContent = String(n);
  b.setAttribute('aria-label', 'To check (' + n + ')');
  b.classList.toggle('hidden', !n);
  return n;
}

// Called on every snapshot: badge, live modal, and at most one local notification a day.
export function refreshToCheck(isAdminFn) {
  if (isAdminFn) adminFn = isAdminFn;
  const n = updateToCheckBadge();
  const m = document.getElementById('tocheck-modal');
  if (m && !m.classList.contains('hidden')) renderToCheck();
  if (n) runToCheckNotify(n);
}

export function openToCheck(isAdminFn) {
  if (isAdminFn) adminFn = isAdminFn;
  if (READONLY || !adminFn()) return;
  renderToCheck();
  openModal('tocheck-modal');
}

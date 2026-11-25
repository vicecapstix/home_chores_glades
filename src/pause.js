// Holiday / pause mode: whole-house freeze of due dates and streaks (#70).
import { state } from './state.js';
import { READONLY } from './config.js';
import { patchRoot } from './firebase.js';
import { showToast } from './ui.js';
import { esc, localDateStr } from './utils.js';
import { computeReturnPatch } from './away.js';

const DAY = 86400000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseLocal(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }

export function pauseText(pause = state.pause) {
  if (!pause || !DATE_RE.test(pause.until || '')) return '';
  const d = parseLocal(pause.until).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  return '⏸ Paused until ' + d;
}

export function renderPauseBanner() {
  const el = document.getElementById('pause-banner');
  if (!el) return;
  const txt = pauseText();
  el.textContent = txt;
  el.classList.toggle('hidden', !txt);
}

// Pure: the multi-path update that ends a pause. `endMs` is when the pause ended.
export function computeResumePatch(pause, tasks, members, endMs, today = localDateStr(new Date(endMs))) {
  const since = pause.since || endMs;
  const dur = Math.max(0, endMs - since);
  const patch = { pause: null };
  if (!dur) return patch;
  Object.values(tasks).forEach(t => {
    if (t.freq === 'once' || !t.lastDone || t.lastDone >= since) return;
    patch['tasks/' + t.id + '/lastDone'] = Math.min(t.lastDone + dur, endMs);
  });
  const days = Math.round(dur / DAY);
  const sinceDay = localDateStr(new Date(since));
  Object.values(members).forEach(m => {
    if (!m.lastStreakDate || m.lastStreakDate >= sinceDay) return;
    const d = parseLocal(m.lastStreakDate);
    d.setDate(d.getDate() + days);
    const shifted = localDateStr(d);
    patch['members/' + m.name + '/lastStreakDate'] = shifted > today ? today : shifted;
  });
  mergeExpiredAway(patch, { since, dur, days }, tasks, members, endMs, today);
  return patch;
}

// #391: an away period that expired during the pause ends with the resume. Its shift is the union of
// away and pause time (away time minus the overlap), added on top of the pause shift.
function mergeExpiredAway(patch, p, tasks, members, endMs, today) {
  Object.values(members).forEach(m => {
    if (!m.awaySince || !DATE_RE.test(m.awayUntil || '')) return;
    const awayEnd = parseLocal(m.awayUntil); awayEnd.setDate(awayEnd.getDate() + 1);
    const aEnd = awayEnd.getTime();
    if (aEnd > endMs || aEnd <= m.awaySince) return; // still away: its own return handles it
    const overlap = Math.max(0, aEnd - Math.max(m.awaySince, p.since));
    const extra = aEnd - m.awaySince - overlap;
    const away = computeReturnPatch(m, tasks, aEnd, today, overlap);
    Object.keys(away).forEach(k => {
      const id = (k.match(/^tasks\/(.+)\/lastDone$/) || [])[1];
      if (id && patch[k] !== undefined) patch[k] = Math.min(tasks[id].lastDone + p.dur + extra, endMs);
      else if (k.endsWith('/lastStreakDate') && patch[k] !== undefined) {
        const d = parseLocal(away[k]); d.setDate(d.getDate() + p.days);
        const shifted = localDateStr(d); patch[k] = shifted > today ? today : shifted;
      } else patch[k] = away[k];
    });
  });
}

export async function setPause(until, isAdminFn, currentMemberFn) {
  if (READONLY || !isAdminFn()) return;
  if (!DATE_RE.test(until || '') || until < localDateStr()) { showToast('Pick an end date from today on'); return; }
  const pause = { until, by: currentMemberFn() || '', since: Date.now() };
  try {
    await patchRoot({ pause });
    state.pause = pause;
    showToast('Paused until ' + until);
  } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

let _resuming = false;
async function resume(endMs) {
  if (_resuming) return;
  _resuming = true;
  const patch = computeResumePatch(state.pause, state.tasks, state.members, endMs);
  try {
    await patchRoot(patch); state.pause = null;
    Object.keys(patch).forEach(k => { const m = k.match(/^members\/(.+)\/awaySince$/); if (m && state.members[m[1]]) { delete state.members[m[1]].awayUntil; delete state.members[m[1]].awaySince; } });
  } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
  _resuming = false;
}

export async function clearPause(isAdminFn) {
  if (READONLY || !isAdminFn() || !state.pause) return;
  await resume(Date.now());
  showToast('Resumed');
}

// Any editing client finishes an expired pause (start of the day after `until`).
export function checkPauseExpiry(now = Date.now()) {
  const p = state.pause;
  if (READONLY || !p || !DATE_RE.test(p.until || '') || localDateStr(new Date(now)) <= p.until) return;
  const end = parseLocal(p.until); end.setDate(end.getDate() + 1);
  resume(Math.min(end.getTime(), now));
}

export function pauseAdminHTML() {
  const p = state.pause;
  if (p) {
    return '<div class="pause-admin"><div>' + esc(pauseText(p)) + '</div>' +
      '<button class="btn-sm" onclick="window.clearPause()">Resume now</button></div>';
  }
  return '<div class="pause-admin"><label for="pause-until">Pause the house until</label>' +
    '<input type="date" id="pause-until" min="' + esc(localDateStr()) + '" />' +
    '<button class="btn-sm" onclick="window.setPause()">Pause</button></div>';
}

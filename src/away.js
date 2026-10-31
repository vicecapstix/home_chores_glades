// Away mode for one member (#176): camp, sleepover. Their chores are never due,
// rotations skip them and their streak survives. Stored as members/<name>/awayUntil
// (YYYY-MM-DD, inclusive) plus awaySince (ms) so the return can shift the streak.
import { state, getMembers } from './state.js';
import { READONLY } from './config.js';
import { patchMember, patchPaths } from './firebase.js';
import { showToast } from './ui.js';
import { esc, jsq, localDateStr, awayText } from './utils.js';

const DAY = 86400000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseLocal(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }

// Pure: multi-path update ending a member's away period at `endMs`.
// Streak date and recurring chores are shifted by the time away, like computeResumePatch (#70).
export function computeReturnPatch(member, tasks, endMs, today = localDateStr(new Date(endMs))) {
  const base = 'members/' + member.name + '/';
  const patch = { [base + 'awayUntil']: null, [base + 'awaySince']: null };
  const since = member.awaySince || 0;
  const dur = since ? Math.max(0, endMs - since) : 0;
  if (!dur) return patch;
  const sinceDay = localDateStr(new Date(since));
  if (member.lastStreakDate && member.lastStreakDate < sinceDay) {
    const d = parseLocal(member.lastStreakDate);
    d.setDate(d.getDate() + Math.round(dur / DAY));
    const shifted = localDateStr(d);
    patch[base + 'lastStreakDate'] = shifted > today ? today : shifted;
  }
  Object.values(tasks || {}).forEach(t => {
    if (t.person !== member.name || t.freq === 'once' || !t.lastDone || t.lastDone >= since) return;
    patch['tasks/' + t.id + '/lastDone'] = Math.min(t.lastDone + dur, endMs);
  });
  return patch;
}

export async function setAway(name, until, isAdminFn) {
  if (READONLY || !isAdminFn()) return false;
  if (!state.members[name]) return false;
  if (!DATE_RE.test(until || '') || until < localDateStr()) { showToast('Pick a return date from today on'); return false; }
  const fields = { awayUntil: until };
  if (!(state.members[name].awayUntil && state.members[name].awaySince)) fields.awaySince = Date.now(); // extending keeps the original start (#230)
  try { await patchMember(name, fields); Object.assign(state.members[name], fields); showToast(name + ' is away until ' + until); return true; }
  catch (err) { showToast('Save failed: ' + (err.code || err.message)); return false; }
}

const _busy = new Set();
async function endAway(name, endMs) {
  const m = state.members[name];
  if (!m || _busy.has(name)) return false;
  _busy.add(name);
  try {
    await patchPaths(computeReturnPatch(m, state.tasks, endMs));
    delete m.awayUntil; delete m.awaySince;
    return true;
  } catch (err) { showToast('Save failed: ' + (err.code || err.message)); return false; }
  finally { _busy.delete(name); }
}

export async function clearAway(name, isAdminFn) {
  if (READONLY || !isAdminFn() || !state.members[name] || !state.members[name].awayUntil) return false;
  const ok = await endAway(name, Date.now());
  if (ok) showToast(name + ' is back');
  return ok;
}

// Any editing client ends an expired away period (start of the day after awayUntil).
export function checkAwayExpiry(now = Date.now()) {
  if (READONLY) return;
  const today = localDateStr(new Date(now));
  Object.values(state.members).forEach(m => {
    if (!m || !m.awayUntil || !DATE_RE.test(m.awayUntil) || today <= m.awayUntil) return;
    const end = parseLocal(m.awayUntil); end.setDate(end.getDate() + 1);
    endAway(m.name, Math.min(end.getTime(), now));
  });
}

export function awayAdminHTML() {
  const names = getMembers();
  if (!names.length) return '';
  const away = names.filter(n => awayText(state.members[n]));
  return '<div class="pause-admin"><div><b>Away mode</b></div>' +
    away.map(n => '<div>' + esc(n) + ' ' + esc(awayText(state.members[n])) +
      ' <button class="btn-sm" aria-label="' + esc(n) + ' is back" onclick="window.clearAway(\'' + jsq(n) + '\')">Back now</button></div>').join('') +
    '<label for="away-member" class="sr-only">Member</label><select id="away-member">' +
    names.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('') + '</select>' +
    '<label for="away-until" class="sr-only">Away until</label>' +
    '<input type="date" id="away-until" min="' + esc(localDateStr()) + '" />' +
    '<button class="btn-sm" onclick="window.setAway()">Set away</button></div>';
}

import { state, getMembers } from './state.js';
import { READONLY, BADGES, CATEGORIES } from './config.js';
import { patchPaths, takeCheckPending, adjustMemberPoints, appendHistory, removeHistoryEntry, patchTask, patchMember, patchRoot, removeTask, restoreTask, patchSubtask } from './firebase.js';
import { showToast } from './ui.js';
import { pushUndo } from './undo.js';
import { activeMultiplier } from './doublepoints.js';
import { esc, jsq, validTime, validInterval, INTERVAL_MIN, INTERVAL_MAX, freqDays, cycleDays, daysSince, dueStatus, taskPoints, getWeekStart, localDateStr, prevScheduledStart, isStaleDoneOnce, initialLastDone, nextRotationPerson, awayNames, DAY_NAMES } from './utils.js';

// Re-export for other modules
export { dueStatus, taskPoints, freqDays };

// ── Task resets ───────────────────────────────────────────────────────────────

export function checkTaskResets() {
  if (state.pause) return; // paused (or expiry resume pending): freeze resets
  const patch = {};
  const now = Date.now();
  Object.values(state.tasks).forEach(t => {
    if (t.freq === 'once') return;
    const due = t.freq === 'weekdays'
      ? (prevScheduledStart(t.days, now) !== null && prevScheduledStart(t.days, now) > (t.lastDone || 0))
      : daysSince(t.lastDone || 0, now) >= cycleDays(t, t.lastDone);
    if (t.done && due) {
      t.done = false;
      t.lastDoneBy = null;
      t.lastDonePoints = null;
      patch['tasks/' + t.id + '/done'] = false;
      patch['tasks/' + t.id + '/lastDoneBy'] = null;
      patch['tasks/' + t.id + '/lastDonePoints'] = null;
      const next = t.rotation ? nextRotationPerson(t.rotation, t.person, getMembers(), awayNames(now)) : null;
      Object.entries(t.subtasks || {}).forEach(([sid, st]) => {
        if (!st.done) return;
        st.done = false;
        patch['tasks/' + t.id + '/subtasks/' + sid + '/done'] = false;
      });
      if (next) { t.person = next; patch['tasks/' + t.id + '/person'] = next; }
    }
  });
  // One multi-path update touching only the reset leaves (never a full-state set).
  if (READONLY || !Object.keys(patch).length) return;
  patchRoot(patch).catch(err => showToast('Save error: ' + (err.code || err.message)));
}

// ── Weekday chips ─────────────────────────────────────────────────────────────

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // display Mon..Sun

export function dayChipsHTML(selected = [], cls = 'day-chips') {
  const sel = (selected || []).map(Number);
  return '<div class="' + cls + '" role="group" aria-label="Days of the week">' +
    DAY_ORDER.map(d => '<label class="day-chip"><input type="checkbox" value="' + d + '"' + (sel.includes(d) ? ' checked' : '') + ' /><span>' + DAY_NAMES[d] + '</span></label>').join('') +
    '</div>';
}

export function readDays(container) {
  return [...container.querySelectorAll('input:checked')].map(i => Number(i.value)).sort((a, b) => a - b);
}

// ── Rotation chips (#54) ──────────────────────────────────────────────────────

export function rotationChipsHTML(t, members) {
  if (members.length < 2) return '';
  const sel = Array.isArray(t.rotation) ? t.rotation : Object.values(t.rotation || {});
  return '<div class="day-chips edit-rotation" role="group" aria-label="Rotate assignee between (pick 2 or more)">' +
    '<span class="rot-label">Rotate on reset:</span>' +
    members.map(m => '<label class="day-chip"><input type="checkbox" value="' + esc(m) + '"' + (sel.includes(m) ? ' checked' : '') + ' /><span>' + esc(m) + '</span></label>').join('') +
    '</div>';
}

// ── Add task ──────────────────────────────────────────────────────────────────

export async function addTask(isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const name = document.getElementById('new-task').value.trim();
  if (!name) return;
  const freq    = document.getElementById('new-freq').value;
  const person  = document.getElementById('new-person').value;
  const diff    = document.getElementById('new-diff').value;
  const cat     = document.getElementById('new-cat').value;
  const dueDate = freq === 'once' ? document.getElementById('new-duedate').value : '';
  const days    = freq === 'weekdays' ? readDays(document.getElementById('new-days')) : [];
  if (freq === 'weekdays' && !days.length) { showToast('Pick at least one day'); return; }
  const interval = freq === 'interval' ? validInterval(document.getElementById('new-interval')?.value) : 0;
  if (freq === 'interval' && !interval) { showToast('Enter a whole number of days from ' + INTERVAL_MIN + ' to ' + INTERVAL_MAX); return; }
  const dueTime = validTime(document.getElementById('new-duetime')?.value);
  const needsCheck = !!document.getElementById('new-needscheck')?.checked;
  const notesEl = document.getElementById('new-notes');
  const notes   = notesEl.value.trim();
  const id      = 't' + Date.now();
  state.tasks[id] = {
    id, name, freq, person,
    done: false, lastDone: initialLastDone(freq === 'interval' ? { freq, intervalDays: interval } : freq),
    ...(freq === 'weekdays' ? { days } : {}),
    ...(interval ? { intervalDays: interval } : {}),
    ...(needsCheck ? { needsCheck: true } : {}),
    notes: notes || '', difficulty: diff, category: cat || '',
    dueDate: dueDate || '', ...(dueTime ? { dueTime } : {}), subtasks: {}, order: Date.now(),
  };
  state.nextId++;
  document.getElementById('new-task').value = '';
  document.getElementById('new-duedate').value = '';
  if (document.getElementById('new-duetime')) document.getElementById('new-duetime').value = '';
  document.getElementById('new-duedate').style.display = 'none';
  document.getElementById('new-freq').value = 'weekly';
  document.getElementById('new-days').classList.add('hidden');
  document.getElementById('new-interval')?.classList.add('hidden');
  if (document.getElementById('new-interval')) document.getElementById('new-interval').value = '';
  document.querySelectorAll('#new-days input').forEach(i => { i.checked = false; });
  notesEl.value = '';
  notesEl.style.display = 'none';
  if (document.getElementById('new-needscheck')) document.getElementById('new-needscheck').checked = false;
  try { await patchPaths({ ['tasks/' + id]: state.tasks[id], nextId: state.nextId }); } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

// ── Edit / Save ───────────────────────────────────────────────────────────────

export function editTask(id, isAdminFn) {
  if (READONLY || !isAdminFn || !isAdminFn()) return;
  const t = state.tasks[id];
  if (!t) return;
  const card = document.getElementById('tc-' + id);
  if (!card) return;
  const members = getMembers();
  const freqOpts = ['daily','weekly','weekdays','interval','fortnightly','monthly','once'].map(f =>
    '<option value="' + f + '"' + (t.freq === f ? ' selected' : '') + '>' + (f === 'once' ? 'One-off' : f === 'weekdays' ? 'Specific days' : f === 'interval' ? 'Every N days' : f) + '</option>'
  ).join('');
  const diffOpts = ['easy','medium','hard'].map(d =>
    '<option value="' + d + '"' + ((t.difficulty || 'easy') === d ? ' selected' : '') + '>' + d + '</option>'
  ).join('');
  const catOpts = ['', ...CATEGORIES].map(c =>
    '<option value="' + esc(c) + '"' + ((t.category || '') === c ? ' selected' : '') + '>' + (c || 'No category') + '</option>'
  ).join('');
  const personOpts = '<option value="">Anyone</option>' +
    members.map(m => '<option value="' + esc(m) + '"' + (t.person === m ? ' selected' : '') + '>' + esc(m) + '</option>').join('');
  card.className = 'task-card editing';
  card.innerHTML =
    '<input class="edit-name" value="' + esc(t.name) + '" maxlength="60" />' +
    '<div class="edit-row">' +
      '<select class="edit-freq" onchange="this.closest(\'.task-card\').querySelector(\'.edit-duedate\').style.display=this.value===\'once\'?\'\':\'none\';this.closest(\'.task-card\').querySelector(\'.edit-days\').classList.toggle(\'hidden\',this.value!==\'weekdays\');this.closest(\'.task-card\').querySelector(\'.edit-interval\').classList.toggle(\'hidden\',this.value!==\'interval\')">' + freqOpts + '</select>' +
      '<input type="number" class="edit-interval' + (t.freq === 'interval' ? '' : ' hidden') + '" aria-label="Repeat every N days" min="' + INTERVAL_MIN + '" max="' + INTERVAL_MAX + '" step="1" inputmode="numeric" placeholder="Days" value="' + esc(String(validInterval(t.intervalDays) || '')) + '" />' +
      '<input type="date" class="edit-duedate" value="' + esc(t.dueDate || '') + '" style="flex:1;padding:6px 8px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.85rem;font-family:inherit;background:var(--bg);color:var(--text);display:' + (t.freq === 'once' ? '' : 'none') + '" />' +
      '<input type="time" class="edit-duetime" aria-label="Due time" value="' + esc(validTime(t.dueTime)) + '" />' +
      '<select class="edit-diff">' + diffOpts + '</select>' +
      '<select class="edit-cat">' + catOpts + '</select>' +
      '<select class="edit-person">' + personOpts + '</select>' +
    '</div>' +
    dayChipsHTML(t.days, 'day-chips edit-days' + (t.freq === 'weekdays' ? '' : ' hidden')) +
    rotationChipsHTML(t, members) +
    '<label class="edit-check"><input type="checkbox" class="edit-needscheck"' + (t.needsCheck ? ' checked' : '') + ' /> Needs parent check</label>' +
    '<textarea class="edit-notes" placeholder="Notes..." maxlength="300">' + esc(t.notes || '') + '</textarea>' +
    '<div class="edit-actions">' +
      '<button class="btn-sm btn-accent" onclick="window.saveTask(\'' + jsq(id) + '\')">Save</button>' +
      '<button class="btn-sm" onclick="window.cancelEdit(\'' + jsq(id) + '\')">Cancel</button>' +
    '</div>';
  card.querySelector('.edit-name').focus();
}

export async function saveTask(id, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const card = document.getElementById('tc-' + id);
  if (!card) return;
  const name = card.querySelector('.edit-name').value.trim();
  if (!name) return;
  const newFreq = card.querySelector('.edit-freq').value;
  const days = newFreq === 'weekdays' ? readDays(card.querySelector('.edit-days')) : [];
  if (newFreq === 'weekdays' && !days.length) { showToast('Pick at least one day'); return; }
  const interval = newFreq === 'interval' ? validInterval(card.querySelector('.edit-interval').value) : 0;
  if (newFreq === 'interval' && !interval) { showToast('Enter a whole number of days from ' + INTERVAL_MIN + ' to ' + INTERVAL_MAX); return; }
  card.classList.remove('editing');
  document.activeElement?.blur?.();
  const rot = [...card.querySelectorAll('.edit-rotation input:checked')].map(i => i.value);
  if (rot.length >= 2) state.tasks[id].rotation = rot; else delete state.tasks[id].rotation;
  state.tasks[id].name       = name;
  if (newFreq === 'weekdays' && state.tasks[id].freq !== 'weekdays' && !state.tasks[id].done) state.tasks[id].lastDone = initialLastDone('weekdays');
  state.tasks[id].freq       = newFreq;
  if (newFreq === 'weekdays') state.tasks[id].days = days; else delete state.tasks[id].days;
  if (interval) state.tasks[id].intervalDays = interval; else delete state.tasks[id].intervalDays;
  state.tasks[id].dueDate    = card.querySelector('.edit-freq').value === 'once' ? (card.querySelector('.edit-duedate').value || '') : '';
  const dt = validTime(card.querySelector('.edit-duetime')?.value);
  if (dt) state.tasks[id].dueTime = dt; else delete state.tasks[id].dueTime;
  state.tasks[id].difficulty = card.querySelector('.edit-diff').value;
  state.tasks[id].category   = card.querySelector('.edit-cat').value;
  state.tasks[id].person     = card.querySelector('.edit-person').value;
  state.tasks[id].notes      = card.querySelector('.edit-notes').value.trim();
  if (card.querySelector('.edit-needscheck')?.checked) state.tasks[id].needsCheck = true; else { delete state.tasks[id].needsCheck; delete state.tasks[id].checkPending; }
  const t = state.tasks[id], p = 'tasks/' + id + '/';
  const paths = {
    [p + 'name']: t.name, [p + 'freq']: t.freq, [p + 'days']: t.days || null,
    [p + 'dueDate']: t.dueDate, [p + 'dueTime']: t.dueTime || null,
    [p + 'difficulty']: t.difficulty, [p + 'category']: t.category,
    [p + 'person']: t.person, [p + 'notes']: t.notes, [p + 'rotation']: t.rotation || null,
    [p + 'lastDone']: t.lastDone, [p + 'intervalDays']: t.intervalDays || null,
    [p + 'needsCheck']: t.needsCheck || null,
  };
  // Never write checkPending back from the local copy: another device may have just taken it (two parents must not both pay).
  if (!t.needsCheck) paths[p + 'checkPending'] = null;
  try { await patchPaths(paths); } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

// ── Toggle (check/uncheck) ────────────────────────────────────────────────────

// Non-admins act only on their own chores; a done 'Anyone' chore belongs to whoever completed it.
function ownershipBlock(t, me, isAdminFn) {
  if (isAdminFn()) return '';
  if (t.done && t.lastDoneBy) return t.lastDoneBy === me ? '' : 'Only ' + t.lastDoneBy + ' or a parent can undo this';
  if (t.person && t.person !== me) return 'Only your own tasks can be checked';
  return '';
}

// Uncheck (#32): drop this completion's history entry and give back the streak it added.
// Returns the restored streak, or undefined when the streak is left as is.
async function undoCompletionRecords(id, t, c) {
  let r;
  try { r = await removeHistoryEntry({ taskId: id, completedAt: c.at, person: c.by || undefined }); }
  catch (err) { showToast('History update failed: ' + (err.code || err.message)); return; }
  if (!r.removed) return;
  const rest = r.rest;
  const m = c.by && state.members[c.by];
  if (!m || c.prevStreakDate === undefined || c.prevStreakDate === null) return;
  const day = localDateStr(new Date(c.at));
  const otherSameDay = rest.some(h => h.person === c.by && localDateStr(new Date(h.completedAt)) === day);
  if (m.lastStreakDate !== day || otherSameDay || c.prevStreakDate === day) return;
  try { await patchMember(c.by, { streak: c.prevStreak || 0, lastStreakDate: c.prevStreakDate || null }); return c.prevStreak || 0; }
  catch (err) { showToast('Member update failed: ' + (err.code || err.message)); }
}

const asList = v => (Array.isArray(v) ? v : (v ? Object.values(v) : []));

// What checking a chore does to a member's streak and badges (shared by toggleTask's task and member writes).
function completionAward(m, pts, nowTs = Date.now()) {
  const today     = localDateStr(new Date(nowTs)); // the tick time, which for a parent check is when the child ticked
  const yd        = new Date(nowTs); yd.setDate(yd.getDate() - 1);
  const yesterday = localDateStr(yd);
  const lateCheck = !!m.lastStreakDate && m.lastStreakDate > today; // approved after a newer completion: leave the streak alone
  const newStreak = lateCheck || m.lastStreakDate === today ? (m.streak || 0) :
                    m.lastStreakDate === yesterday ? (m.streak || 0) + 1 : 1;
  const currentBadges = asList(m.badges);
  const virtualMember = { ...m, points: (m.points || 0) + pts, completedCount: (m.completedCount || 0) + 1, streak: newStreak };
  const newBadgeIds = BADGES.filter(b => !currentBadges.includes(b.id) && b.check(virtualMember)).map(b => b.id);
  return { streakDate: lateCheck ? m.lastStreakDate : today, newStreak, currentBadges, newBadgeIds };
}

// Uncheck (#220): take back the badges this completion awarded (task.lastDoneBadges) whose check
// now fails on `after` (the member once this completion is undone), filtered from the member's
// live badges so ones added elsewhere meanwhile survive.
async function revokeBadges(name, awarded, after) {
  const have = asList(state.members[name]?.badges);
  const ids = awarded.filter(id => have.includes(id) && !BADGES.find(b => b.id === id)?.check(after));
  if (!ids.length) return;
  try { await patchMember(name, { badges: have.filter(id => !ids.includes(id)) }); }
  catch (err) { showToast('Member update failed: ' + (err.code || err.message)); }
}

// Ids being toggled right now: a quick second tap must not run the uncheck path mid-check (#218).
const toggling = new Set();

export async function toggleTask(id, currentMemberFn, isAdminFn) {
  if (READONLY || toggling.has(id)) return;
  toggling.add(id);
  try { await runToggle(id, currentMemberFn, isAdminFn); } finally { toggling.delete(id); }
}

async function runToggle(id, currentMemberFn, isAdminFn) {
  const t = state.tasks[id];
  if (!t) return;
  const me = currentMemberFn();
  const blocked = ownershipBlock(t, me, isAdminFn);
  if (blocked) { showToast(blocked); return; }
  // 'Anyone' tasks credit the logged-in member who ticks them (if they exist).
  const awardee = t.person || (me && state.members[me] ? me : '');
  if (t.needsCheck && !t.done && !isAdminFn()) return submitForCheck(id, t, me, awardee);
  // A parent ticking a waiting card means "Looks good" for the child (taken atomically, awarded once).
  if (!t.done && t.checkPending && isAdminFn()) return approveCheck(id, isAdminFn, currentMemberFn);
  return applyToggle(id, t, awardee, Date.now(), isAdminFn);
}

// Parent check (#238): a member's tick on a needs-check chore only records a pending request.
async function submitForCheck(id, t, me, awardee) {
  if (!awardee) { showToast('Select a member first'); return; }
  try {
    if (t.checkPending) {
      if (t.checkPending.by !== me) { showToast('Waiting for ' + t.checkPending.by + "'s parent check"); return; }
      await patchTask(id, { checkPending: null }); // cancel own request
    } else await patchTask(id, { checkPending: { by: awardee, at: Date.now() }, checkNote: null });
  } catch (err) { showToast('Update failed: ' + (err.code || err.message)); }
}

// Admin: "Looks good". The pending request is taken atomically first, so a double tap or a second
// parent cannot award twice; it is put back if the completion cannot start.
export async function approveCheck(id, isAdminFn, currentMemberFn) {
  if (READONLY || !isAdminFn()) return;
  const t = state.tasks[id];
  if (!t || t.done || !t.checkPending || checking.has(id)) return;
  checking.add(id);
  try {
    let p;
    try { p = await takeCheckPending(id); } catch (err) { showToast('Update failed: ' + (err.code || err.message)); return; }
    if (!p) { showToast('Already checked'); return; }
    if (!state.members[p.by]) { showToast(p.by + ' is no longer a member'); await patchTask(id, { checkPending: p }).catch(() => {}); return; }
    const ok = await applyToggle(id, t, p.by, p.at, isAdminFn, currentMemberFn() || 'admin');
    if (ok === false) await patchTask(id, { checkPending: p }).catch(() => {}); // completion not saved: keep the child's request
  } finally { checking.delete(id); }
}

// Admin: "Not yet". Clears the request and stores an optional short reason; no points.
export async function sendBackCheck(id, reason, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const t = state.tasks[id];
  if (!t || !t.checkPending || checking.has(id)) return;
  checking.add(id);
  try {
    const p = await takeCheckPending(id);
    if (!p) { showToast('Already checked'); return; }
    const note = String(reason || '').trim().slice(0, 100);
    await patchTask(id, { checkNote: note || null });
    showToast('Sent back to ' + p.by);
  } catch (err) { showToast('Update failed: ' + (err.code || err.message)); }
  finally { checking.delete(id); }
}
const checking = new Set();

async function applyToggle(id, t, awardee, nowTs, isAdminFn, checkedBy) {
  const done = !t.done;
  // Double-points day (#225), judged at the tick time (for a parent check, when the child ticked);
  // stored as lastDonePoints so uncheck reverses exactly.
  const earned = taskPoints(t) * activeMultiplier(state.doublePoints, new Date(nowTs));
  // Check remembers the previous lastDone (and streak) so uncheck can restore them (#32).
  const taskUpdate = { done, lastDone: done ? nowTs : (typeof t.prevLastDone === 'number' ? t.prevLastDone : t.lastDone) };
  if (done) { taskUpdate.prevLastDone = t.lastDone || 0; taskUpdate.checkPending = null; taskUpdate.checkNote = null; }
  else taskUpdate.prevLastDone = null;
  if (done && awardee) {
    const am = state.members[awardee];
    if (am) {
      taskUpdate.prevStreak = am.streak || 0; taskUpdate.prevStreakDate = am.lastStreakDate || '';
      const ids = completionAward(am, earned, nowTs).newBadgeIds;
      taskUpdate.lastDoneBadges = ids.length ? ids : null; // uncheck takes back only these (#220)
    }
    taskUpdate.lastDoneBy     = awardee;
    taskUpdate.lastDonePoints = earned;
    taskUpdate.lastDoneWeek   = getWeekStart();
  } else if (!done) {
    taskUpdate.lastDoneBy     = null;
    taskUpdate.lastDonePoints = null;
    taskUpdate.lastDoneWeek   = null;
    taskUpdate.prevStreak     = null;
    taskUpdate.prevStreakDate = null;
    taskUpdate.lastDoneBadges = null;
  }
  const weekStart = getWeekStart();
  const completion = { by: t.lastDoneBy, at: t.lastDone, prevStreak: t.prevStreak, prevStreakDate: t.prevStreakDate, badges: asList(t.lastDoneBadges) };
  // Uncheck: reverse points FIRST, atomically on the live value. A member may
  // not claw back points they already spent; an admin can (balance may go < 0).
  let reversal = null;
  const beforeUncheck = !done && state.members[t.lastDoneBy] ? { ...state.members[t.lastDoneBy] } : null;
  if (!done && t.lastDoneBy && t.lastDonePoints && state.members[t.lastDoneBy]) {
    const countedWeek = t.lastDoneWeek || (t.lastDone ? getWeekStart(new Date(t.lastDone)) : '');
    reversal = { pts: -t.lastDonePoints, count: -1, weekStart, countWeek: countedWeek === weekStart, allowNegative: isAdminFn() };
    try {
      const r = await adjustMemberPoints(t.lastDoneBy, reversal);
      if (!r.ok && r.reason === 'insufficient') { showToast('Points already spent — ask a parent'); return; }
      if (!r.ok) { showToast('Member update failed'); return; }
    } catch (err) { showToast('Member update failed: ' + (err.code || err.message)); return; }
  }
  try {
    await patchTask(id, taskUpdate);
  } catch (err) {
    showToast('Update failed: ' + (err.code || err.message));
    // Task still checked: put the reversed points back.
    if (reversal) adjustMemberPoints(t.lastDoneBy, { ...reversal, pts: -reversal.pts, count: 1, allowNegative: true }).catch(() => {});
    return false;
  }
  if (!done) {
    const streak = await undoCompletionRecords(id, t, completion);
    const b = beforeUncheck;
    if (reversal && b) await revokeBadges(completion.by, completion.badges, { ...b, completedCount: Math.max(0, (b.completedCount || 0) - 1), streak: streak ?? b.streak });
  }
  // Award points when checking
  if (done && awardee) {
    const m = state.members[awardee];
    if (!m) return;
    const pts = earned;
    const { streakDate, newStreak, currentBadges, newBadgeIds } = completionAward(m, pts, nowTs);
    const memberUpdate = { streak: newStreak, lastStreakDate: streakDate };
    if (newBadgeIds.length) memberUpdate.badges = [...currentBadges, ...newBadgeIds];
    try {
      // Points/count/week via one atomic transaction; streak/badges stay a patch.
      const r = await adjustMemberPoints(awardee, { pts, count: 1, weekStart });
      if (!r.ok) { showToast('Member update failed'); return; }
      await patchMember(awardee, memberUpdate);
      newBadgeIds.forEach(bid => {
        const b = BADGES.find(b => b.id === bid);
        if (b) showToast(b.icon + ' Badge earned: ' + b.label + '!');
      });
    } catch (err) { showToast('Member update failed: ' + (err.code || err.message)); }
    // History
    const histEntry  = { taskId: id, taskName: t.name, person: awardee, completedAt: nowTs, points: earned, ...(checkedBy ? { checkedBy } : {}) };
    try {
      await appendHistory(histEntry);
    } catch (err) { showToast('History update failed: ' + (err.code || err.message)); }
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteTask(id, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const t = state.tasks[id];
  if (!t) return;
  const savedData = { ...t };
  try {
    await removeTask(id);
    pushUndo({ label: t.name, undo: () => restoreTask(id, savedData) });
  } catch (err) {
    showToast('Delete failed: ' + (err.code || err.message));
  }
}

// ── Subtasks ──────────────────────────────────────────────────────────────────

export function toggleSubtasks(taskId) {
  const card = document.getElementById('tc-' + taskId);
  if (!card) return;
  card.querySelector('.subtask-toggle')?.classList.toggle('open');
  card.querySelector('.subtask-list')?.classList.toggle('open');
}

export async function toggleSubtask(taskId, subId, currentMemberFn, isAdminFn) {
  if (READONLY || !currentMemberFn || !isAdminFn) return;
  const t = state.tasks[taskId];
  if (!t?.subtasks?.[subId]) return;
  const blocked = ownershipBlock(t, currentMemberFn(), isAdminFn);
  if (blocked) { showToast(blocked); return; }
  try {
    await patchSubtask(taskId, subId, { done: !t.subtasks[subId].done });
  } catch (err) { showToast('Update failed: ' + (err.code || err.message)); }
}

export async function addSubtask(taskId, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const card = document.getElementById('tc-' + taskId);
  if (!card) return;
  const inp  = card.querySelector('.subtask-add input');
  const name = inp?.value.trim();
  if (!name) return;
  const t = state.tasks[taskId];
  if (!t) return;
  if (!t.subtasks) t.subtasks = {};
  const subId = 's' + Date.now();
  const sub = { id: subId, name, done: false };
  t.subtasks[subId] = sub;
  try { await patchSubtask(taskId, subId, sub); } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

export async function removeSubtask(taskId, subId, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const t = state.tasks[taskId];
  if (!t?.subtasks) return;
  delete t.subtasks[subId];
  try { await patchRoot({ ['tasks/' + taskId + '/subtasks/' + subId]: null }); } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

// ── Claim ─────────────────────────────────────────────────────────────────────

export async function claimTask(id, currentMemberFn) {
  if (READONLY) return;
  const member = currentMemberFn();
  if (!member) { showToast('Select a member first'); return; }
  const t = state.tasks[id];
  if (!t) return;
  if (t.person) { showToast('Already assigned to ' + t.person); return; }
  if (t.done) { showToast('Already done'); return; }
  state.tasks[id].person = member;
  try { await patchTask(id, { person: member }); } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

// ── Skip this occurrence (admin) ──────────────────────────────────────────────

// No points, no history, no streak: only lastDone/skippedAt move.
export async function skipTask(id, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const t = state.tasks[id];
  if (!t || t.freq === 'once' || t.done) return;
  const prev = { lastDone: t.lastDone ?? 0, skippedAt: t.skippedAt ?? null };
  const now = Date.now();
  try {
    await patchTask(id, { lastDone: now, skippedAt: now });
  } catch (err) {
    showToast('Skip failed: ' + (err.code || err.message)); return;
  }
  t.lastDone = now; t.skippedAt = now;
  pushUndo({
    label: 'Skipped "' + t.name + '"',
    undo: async () => {
      await patchTask(id, prev);
      if (state.tasks[id]) { state.tasks[id].lastDone = prev.lastDone; state.tasks[id].skippedAt = prev.skippedAt; }
    },
  });
  showToast('Skipped "' + t.name + '"');
}

// ── Reorder (move up/down) ────────────────────────────────────────────────────

// Pure: given the ids of a section in display order, move `id` by `dir` (-1/+1)
// with insert semantics. Returns { taskId: newOrder } for tasks that changed.
export function moveOrders(peerIds, tasks, id, dir) {
  const from = peerIds.indexOf(id), to = from + dir;
  if (from < 0 || to < 0 || to >= peerIds.length) return {};
  const vals = peerIds.map(x => tasks[x]?.order || 0).sort((a, b) => a - b);
  const strict = vals.every((v, i) => i === 0 || v > vals[i - 1]);
  const slots = strict ? vals : vals.map((_, i) => vals[0] + i);
  const next = peerIds.slice();
  next.splice(to, 0, next.splice(from, 1)[0]);
  const out = {};
  next.forEach((x, i) => { if ((tasks[x]?.order || 0) !== slots[i]) out[x] = slots[i]; });
  return out;
}

export async function moveTask(id, dir, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  if (dir !== -1 && dir !== 1) return;
  const card = document.getElementById('tc-' + id);
  const section = card?.closest('.section');
  if (!section || !state.tasks[id]) return;
  const peers = [...section.querySelectorAll('.task-card')].map(c => c.dataset.id).filter(x => state.tasks[x]);
  const changes = moveOrders(peers, state.tasks, id, dir);
  const ids = Object.keys(changes);
  if (!ids.length) return;
  const fields = {};
  ids.forEach(x => { fields['tasks/' + x + '/order'] = changes[x]; });
  try {
    await patchRoot(fields);
    ids.forEach(x => { state.tasks[x].order = changes[x]; });
  } catch (err) { showToast('Reorder failed: ' + (err.code || err.message)); }
}

// Admin: delete every done one-off from an earlier day in ONE multi-path update (#142).
// History is untouched; the undo toast restores the tasks in one multi-path update too.
export async function clearDoneOnes(isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const ids = Object.keys(state.tasks).filter(id => isStaleDoneOnce(state.tasks[id]));
  if (!ids.length) return;
  if (!confirm('Delete ' + ids.length + ' done one-off chore' + (ids.length > 1 ? 's' : '') + '? History is kept.')) return;
  const saved = {}, gone = {};
  ids.forEach(id => { saved['tasks/' + id] = { ...state.tasks[id] }; gone['tasks/' + id] = null; });
  try {
    await patchRoot(gone);
    pushUndo({ label: ids.length + ' done one-off' + (ids.length > 1 ? 's' : ''), undo: () => patchRoot(saved) });
    showToast('Cleared ' + ids.length + ' done one-off' + (ids.length > 1 ? 's' : ''));
  } catch (err) { showToast('Clear failed: ' + (err.code || err.message)); }
}

import { state, getMembers } from './state.js';
import { READONLY, BADGES, CATEGORIES } from './config.js';
import { writeState, patchTask, patchMember, patchRoot, removeTask, restoreTask, patchSubtask } from './firebase.js';
import { showToast } from './ui.js';
import { pushUndo } from './undo.js';
import { esc, freqDays, dueStatus, taskPoints, getWeekStart } from './utils.js';

// Re-export for other modules
export { dueStatus, taskPoints, freqDays };

// ── Task resets ───────────────────────────────────────────────────────────────

export function checkTaskResets() {
  let changed = false;
  const now = Date.now();
  Object.values(state.tasks).forEach(t => {
    if (t.freq === 'once') return;
    if (t.done && now - (t.lastDone || 0) >= freqDays(t.freq) * 86400000) {
      t.done = false;
      t.lastDoneBy = null;
      t.lastDonePoints = null;
      changed = true;
    }
  });
  if (changed) writeState().catch(err => showToast('Save error: ' + (err.code || err.message)));
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
  const notesEl = document.getElementById('new-notes');
  const notes   = notesEl.value.trim();
  const id      = 't' + Date.now();
  state.tasks[id] = {
    id, name, freq, person,
    done: false, lastDone: Date.now() - freqDays(freq) * 86400000,
    notes: notes || '', difficulty: diff, category: cat || '',
    dueDate: dueDate || '', subtasks: {}, order: Date.now(),
  };
  state.nextId++;
  document.getElementById('new-task').value = '';
  document.getElementById('new-duedate').value = '';
  document.getElementById('new-duedate').style.display = 'none';
  document.getElementById('new-freq').value = 'weekly';
  notesEl.value = '';
  notesEl.style.display = 'none';
  try { await writeState(); } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

// ── Edit / Save ───────────────────────────────────────────────────────────────

export function editTask(id) {
  const t = state.tasks[id];
  if (!t) return;
  const card = document.getElementById('tc-' + id);
  if (!card) return;
  const members = getMembers();
  const freqOpts = ['daily','weekly','fortnightly','monthly','once'].map(f =>
    '<option value="' + f + '"' + (t.freq === f ? ' selected' : '') + '>' + (f === 'once' ? 'One-off' : f) + '</option>'
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
      '<select class="edit-freq" onchange="this.closest(\'.task-card\').querySelector(\'.edit-duedate\').style.display=this.value===\'once\'?\'\':\'none\'">' + freqOpts + '</select>' +
      '<input type="date" class="edit-duedate" value="' + esc(t.dueDate || '') + '" style="flex:1;padding:6px 8px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.85rem;font-family:inherit;background:var(--bg);color:var(--text);display:' + (t.freq === 'once' ? '' : 'none') + '" />' +
      '<select class="edit-diff">' + diffOpts + '</select>' +
      '<select class="edit-cat">' + catOpts + '</select>' +
      '<select class="edit-person">' + personOpts + '</select>' +
    '</div>' +
    '<textarea class="edit-notes" placeholder="Notes..." maxlength="300">' + esc(t.notes || '') + '</textarea>' +
    '<div class="edit-actions">' +
      '<button class="btn-sm btn-accent" onclick="window.saveTask(\'' + id + '\')">Save</button>' +
      '<button class="btn-sm" onclick="window.cancelEdit(\'' + id + '\')">Cancel</button>' +
    '</div>';
  card.querySelector('.edit-name').focus();
}

export async function saveTask(id, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const card = document.getElementById('tc-' + id);
  if (!card) return;
  const name = card.querySelector('.edit-name').value.trim();
  if (!name) return;
  state.tasks[id].name       = name;
  state.tasks[id].freq       = card.querySelector('.edit-freq').value;
  state.tasks[id].dueDate    = card.querySelector('.edit-freq').value === 'once' ? (card.querySelector('.edit-duedate').value || '') : '';
  state.tasks[id].difficulty = card.querySelector('.edit-diff').value;
  state.tasks[id].category   = card.querySelector('.edit-cat').value;
  state.tasks[id].person     = card.querySelector('.edit-person').value;
  state.tasks[id].notes      = card.querySelector('.edit-notes').value.trim();
  try { await writeState(); } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

// ── Toggle (check/uncheck) ────────────────────────────────────────────────────

export async function toggleTask(id, currentMemberFn, isAdminFn) {
  if (READONLY) return;
  const t = state.tasks[id];
  if (!t) return;
  const me = currentMemberFn();
  if (!isAdminFn() && t.person && t.person !== me) {
    showToast('Only your own tasks can be checked');
    return;
  }
  const done = !t.done;
  const taskUpdate = { done, lastDone: done ? Date.now() : t.lastDone };
  if (done && t.person) {
    taskUpdate.lastDoneBy     = t.person;
    taskUpdate.lastDonePoints = taskPoints(t);
  } else if (!done) {
    taskUpdate.lastDoneBy     = null;
    taskUpdate.lastDonePoints = null;
  }
  try {
    await patchTask(id, taskUpdate);
  } catch (err) {
    showToast('Update failed: ' + (err.code || err.message)); return;
  }
  // Reverse points when unchecking
  if (!done && t.lastDoneBy && t.lastDonePoints) {
    const m = state.members[t.lastDoneBy];
    if (m) {
      const weekStart = getWeekStart();
      try {
        await patchMember(t.lastDoneBy, {
          points:       Math.max(0, (m.points || 0) - t.lastDonePoints),
          completedCount: Math.max(0, (m.completedCount || 0) - 1),
          weekPoints:   Math.max(0, (m.weekStart === weekStart ? (m.weekPoints || 0) : 0) - t.lastDonePoints),
          weekStart,
        });
      } catch (err) { showToast('Member update failed: ' + (err.code || err.message)); }
    }
  }
  // Award points when checking
  if (done && t.person) {
    const m = state.members[t.person];
    if (!m) return;
    const pts       = taskPoints(t);
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const weekStart = getWeekStart();
    const newPoints = (m.points || 0) + pts;
    const newCount  = (m.completedCount || 0) + 1;
    const newStreak = m.lastStreakDate === today     ? (m.streak || 0) :
                      m.lastStreakDate === yesterday ? (m.streak || 0) + 1 : 1;
    const newWeekPoints = (m.weekStart === weekStart ? (m.weekPoints || 0) : 0) + pts;
    const currentBadges = m.badges || [];
    const virtualMember = { ...m, points: newPoints, completedCount: newCount, streak: newStreak };
    const newBadgeIds = BADGES
      .filter(b => !currentBadges.includes(b.id) && b.check(virtualMember))
      .map(b => b.id);
    const memberUpdate = {
      points: newPoints, completedCount: newCount, streak: newStreak,
      lastStreakDate: today, weekPoints: newWeekPoints, weekStart,
    };
    if (newBadgeIds.length) memberUpdate.badges = [...currentBadges, ...newBadgeIds];
    try {
      await patchMember(t.person, memberUpdate);
      newBadgeIds.forEach(bid => {
        const b = BADGES.find(b => b.id === bid);
        if (b) showToast(b.icon + ' Badge earned: ' + b.label + '!');
      });
    } catch (err) { showToast('Member update failed: ' + (err.code || err.message)); }
    // History
    const histEntry  = { taskId: id, taskName: t.name, person: t.person, completedAt: Date.now(), points: taskPoints(t) };
    const newHistory = (state.history || []).concat([histEntry]).slice(-500);
    try {
      await patchRoot({ history: newHistory });
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

export async function toggleSubtask(taskId, subId) {
  if (READONLY) return;
  const t = state.tasks[taskId];
  if (!t?.subtasks?.[subId]) return;
  try {
    await patchSubtask(taskId, subId, { done: !t.subtasks[subId].done });
  } catch (err) { showToast('Update failed: ' + (err.code || err.message)); }
}

export async function addSubtask(taskId) {
  if (READONLY) return;
  const card = document.getElementById('tc-' + taskId);
  if (!card) return;
  const inp  = card.querySelector('.subtask-add input');
  const name = inp?.value.trim();
  if (!name) return;
  const t = state.tasks[taskId];
  if (!t) return;
  if (!t.subtasks) t.subtasks = {};
  const subId = 's' + Date.now();
  t.subtasks[subId] = { id: subId, name, done: false };
  try { await writeState(); } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

export async function removeSubtask(taskId, subId) {
  if (READONLY) return;
  const t = state.tasks[taskId];
  if (!t?.subtasks) return;
  delete t.subtasks[subId];
  try { await writeState(); } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

// ── Claim ─────────────────────────────────────────────────────────────────────

export async function claimTask(id, currentMemberFn) {
  if (READONLY) return;
  const member = currentMemberFn();
  if (!member) { showToast('Select a member first'); return; }
  const t = state.tasks[id];
  if (!t) return;
  state.tasks[id].person = member;
  try { await writeState(); } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

// ── Drag-and-drop reorder ─────────────────────────────────────────────────────

export function initDragDrop() {
  let draggedId = null;
  const taskList = document.getElementById('task-list');

  taskList.addEventListener('dragstart', e => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    draggedId = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  taskList.addEventListener('dragend', e => {
    e.target.closest('.task-card')?.classList.remove('dragging');
    draggedId = null;
    taskList.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));
  });
  taskList.addEventListener('dragover', e => {
    e.preventDefault();
    const card = e.target.closest('.task-card');
    if (!card || card.dataset.id === draggedId) return;
    taskList.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));
    card.classList.add('drag-over');
  });
  taskList.addEventListener('dragleave', e => {
    e.target.closest('.task-card')?.classList.remove('drag-over');
  });
  taskList.addEventListener('drop', async e => {
    e.preventDefault();
    taskList.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));
    const card = e.target.closest('.task-card');
    if (!card || !draggedId) return;
    const targetId = card.dataset.id;
    if (targetId === draggedId) return;
    const a = state.tasks[draggedId], b = state.tasks[targetId];
    if (!a || !b) return;
    const tmp = a.order || 0;
    a.order = b.order || 0;
    b.order = tmp;
    draggedId = null;
    try { await writeState(); } catch (err) { showToast('Save error: ' + (err.code || err.message)); }
  });
}

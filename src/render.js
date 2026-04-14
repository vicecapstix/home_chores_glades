import { state, getMembers } from './state.js';
import { PCOLS, BADGES, READONLY } from './config.js';
import { esc, dueStatus } from './utils.js';
import { pColor } from './ui.js';

// ── Session function references (set once via initRender) ─────────────────────
let _isAdmin       = () => false;
let _currentMember = () => '';

export function initRender(isAdminFn, currentMemberFn) {
  _isAdmin       = isAdminFn;
  _currentMember = currentMemberFn;
}

// ── Filter / select state ─────────────────────────────────────────────────────
let filter     = 'all';
let filterCat  = '';
let selectMode = false;
let selectedIds = new Set();

// ── Filter setters ────────────────────────────────────────────────────────────

export function setFilter(f) {
  filter    = f;
  filterCat = '';
  _renderFilters();
  _renderTasks();
}

export function setCatFilter(c) {
  filterCat = filterCat === c ? '' : c;
  filter    = 'all';
  _renderFilters();
  _renderTasks();
}

// ── Select mode ───────────────────────────────────────────────────────────────

export function getSelectMode() { return selectMode; }
export function getSelectedIds() { return selectedIds; }

export function toggleSelectMode() {
  selectMode  = !selectMode;
  selectedIds = new Set();
  const btn = document.getElementById('btn-select');
  if (btn) btn.textContent = selectMode ? 'Done' : 'Select';
  _renderTasks();
  _updateBulkBar();
}

export function toggleSelect(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  const card = document.getElementById('tc-' + id);
  if (card) {
    card.classList.toggle('selected', selectedIds.has(id));
    const box = card.querySelector('.sel-box svg');
    if (box) box.style.display = selectedIds.has(id) ? 'block' : 'none';
  }
  _updateBulkBar();
}

function _updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  if (!bar) return;
  if (selectMode && selectedIds.size > 0) {
    bar.classList.add('visible');
    document.getElementById('bulk-count').textContent = selectedIds.size + ' selected';
    const src = document.getElementById('new-person');
    const dst = document.getElementById('bulk-person');
    if (src && dst) dst.innerHTML = src.innerHTML;
  } else {
    bar.classList.remove('visible');
  }
}

// ── Bulk actions ──────────────────────────────────────────────────────────────

export async function bulkAssign() {
  if (READONLY || !selectedIds.size) return;
  const person = document.getElementById('bulk-person').value;
  selectedIds.forEach(id => { if (state.tasks[id]) state.tasks[id].person = person; });
  const { writeState } = await import('./firebase.js');
  const { showToast }  = await import('./ui.js');
  try { await writeState(); } catch (err) { showToast('Save failed: ' + err.code); }
  toggleSelectMode();
}

export async function bulkDelete() {
  if (READONLY || !selectedIds.size) return;
  const n = selectedIds.size;
  if (!confirm('Delete ' + n + ' task' + (n > 1 ? 's' : '') + '?')) return;
  const { removeTask, restoreTask } = await import('./firebase.js');
  const { showToast }               = await import('./ui.js');
  const { pushUndo }                = await import('./undo.js');
  const saved = [...selectedIds].map(id => ({ id, data: { ...state.tasks[id] } }));
  try {
    await Promise.all([...selectedIds].map(id => removeTask(id)));
    pushUndo({
      label: n + ' tasks',
      undo: () => Promise.all(saved.map(({ id, data }) => restoreTask(id, data))),
    });
    showToast('Deleted ' + n + ' task' + (n > 1 ? 's' : ''));
  } catch (err) {
    showToast('Delete failed: ' + (err.code || err.message));
  }
  toggleSelectMode();
}

// ── Main render entry point ───────────────────────────────────────────────────

export function render() {
  _renderHeader();
  _renderMembers();
  _renderMemberSelect();
  _renderFilters();
  _renderTasks();
  if (!READONLY) {
    document.body.setAttribute('data-role', _isAdmin() ? 'admin' : 'member');
  }
}

// ── Header ────────────────────────────────────────────────────────────────────

function _renderHeader() {
  const tasks = _visibleTasks();
  const total = tasks.length;
  const done  = tasks.filter(t => t.done).length;
  const over  = tasks.filter(t => dueStatus(t) === 'overdue').length;
  const pct   = total ? Math.round(done / total * 100) : 0;
  document.getElementById('h-total').textContent   = total;
  document.getElementById('h-done').textContent    = done;
  document.getElementById('h-overdue').textContent = over;
  document.getElementById('h-pct').textContent     = pct + '%';
  document.getElementById('prog').style.width      = pct + '%';
}

// ── Members bar ───────────────────────────────────────────────────────────────

function _renderMembers() {
  const members = getMembers();
  const admin   = _isAdmin();
  document.getElementById('member-chips').innerHTML = members.map((m, i) => {
    const c = PCOLS[i % PCOLS.length];
    const mem = state.members[m] || {};
    const streak = mem.streak || 0;
    const badgeIcons = (mem.badges || []).map(id => {
      const b = BADGES.find(b => b.id === id); return b ? b.icon : '';
    }).join('');
    return '<span class="chip" data-member="' + esc(m) + '" style="background:' + c.bg + ';color:' + c.text + ';">' +
      esc(m) +
      ' <span style="opacity:0.55;font-size:0.75em">' + (mem.points || 0) + '</span>' +
      (streak >= 2 ? ' 🔥' + streak : '') +
      (badgeIcons ? ' ' + badgeIcons : '') +
      ' <span class="chip-del">×</span></span>';
  }).join('');
}

export function initMemberChipClicks(removeMemberFn) {
  document.getElementById('member-chips').addEventListener('click', function(e) {
    if (e.target.classList.contains('chip-del')) {
      removeMemberFn(e.target.closest('.chip').dataset.member);
    }
  });
}

// ── Member select dropdown ────────────────────────────────────────────────────

function _renderMemberSelect() {
  const sel = document.getElementById('new-person');
  const cur = sel.value;
  const members = getMembers();
  sel.innerHTML = '<option value="">Anyone</option>' +
    members.map(m => '<option value="' + esc(m) + '"' + (m === cur ? ' selected' : '') + '>' + esc(m) + '</option>').join('');
}

// ── Filters ───────────────────────────────────────────────────────────────────

function _renderFilters() {
  const container = document.getElementById('filters');
  if (!container) return;
  const tasks = _visibleTasks();
  const counts = {
    all:     tasks.length,
    pending: tasks.filter(t => !t.done).length,
    overdue: tasks.filter(t => dueStatus(t) === 'overdue').length,
    done:    tasks.filter(t => t.done).length,
  };
  const defs = [
    { k: 'all',     label: 'All' },
    { k: 'pending', label: 'Pending' },
    { k: 'overdue', label: 'Overdue' },
    { k: 'done',    label: 'Done today' },
  ];
  let html = defs.map(d =>
    '<button class="filter-pill' + (filter === d.k ? ' active' : '') + '" onclick="window.setFilter(\'' + d.k + '\')">' +
    d.label + '<span class="count">' + counts[d.k] + '</span></button>'
  ).join('');
  const cats = [...new Set(tasks.map(t => t.category).filter(Boolean))].sort();
  if (cats.length) {
    html += '<span style="width:1px;background:var(--border);margin:0 4px;align-self:stretch;flex-shrink:0;display:inline-block;"></span>';
    html += cats.map(c =>
      '<button class="filter-pill' + (filterCat === c ? ' active' : '') + '" onclick="window.setCatFilter(\'' + esc(c) + '\')">' + esc(c) + '</button>'
    ).join('');
  }
  container.innerHTML = html;
}

// ── Tasks list ────────────────────────────────────────────────────────────────

function _renderTasks() {
  let tasks = _visibleTasks();
  if (filter === 'pending') tasks = tasks.filter(t => !t.done);
  else if (filter === 'overdue') tasks = tasks.filter(t => dueStatus(t) === 'overdue');
  else if (filter === 'done') tasks = tasks.filter(t => t.done);
  if (filterCat) tasks = tasks.filter(t => t.category === filterCat);

  const available = tasks.filter(t => !t.done && !t.person);
  const rest      = tasks.filter(t => t.done || t.person);
  const statusOrder = { overdue: 0, soon: 1, ok: 2, done: 3 };
  rest.sort((a, b) => {
    const sd = (statusOrder[dueStatus(a)] || 2) - (statusOrder[dueStatus(b)] || 2);
    return sd !== 0 ? sd : (a.order || 0) - (b.order || 0);
  });

  const sections = { available, overdue: [], soon: [], ok: [], done: [] };
  rest.forEach(t => sections[dueStatus(t)].push(t));

  const defs = [
    { k: 'available', label: 'Available',  dot: 'dot-available' },
    { k: 'overdue',   label: 'Overdue',    dot: 'dot-overdue' },
    { k: 'soon',      label: 'Due soon',   dot: 'dot-soon' },
    { k: 'ok',        label: 'Upcoming',   dot: 'dot-ok' },
    { k: 'done',      label: 'Done today', dot: 'dot-done' },
  ];

  let html = '';
  for (const d of defs) {
    if (!sections[d.k].length) continue;
    html += '<div class="section"><div class="section-head"><span class="section-dot ' + d.dot + '"></span>' + d.label + '</div>';
    sections[d.k].forEach(t => { html += cardHTML(t); });
    html += '</div>';
  }
  if (!html) html = '<div class="empty">Nothing here — all clear!</div>';
  const taskList = document.getElementById('task-list');
  taskList.innerHTML = html;
  taskList.classList.toggle('select-mode', selectMode);
}

// ── Card HTML ─────────────────────────────────────────────────────────────────

export function cardHTML(t) {
  const s   = dueStatus(t);
  const pc  = t.person ? pColor(t.person) : null;
  const personTag = t.person
    ? (pc ? '<span class="tag" style="background:' + pc.bg + ';color:' + pc.text + ';">' + esc(t.person) + '</span>' : '')
    : '<button class="btn-claim" onclick="window.claimTask(\'' + t.id + '\')">Claim</button>';
  const dueTag = s === 'overdue' ? '<span class="tag tag-overdue">Overdue</span>'
               : s === 'soon'    ? '<span class="tag tag-soon">Due soon</span>'
               : s === 'ok'      ? '<span class="tag tag-ok">On track</span>' : '';
  const diff = t.difficulty || 'easy';
  const diffTag = '<span class="tag tag-' + diff + '">' + diff + '</span>';
  const freqTag = t.freq === 'once'
    ? '<span class="tag tag-freq">📅 ' + esc(t.dueDate || 'One-off') + '</span>'
    : '<span class="tag tag-freq">' + t.freq + '</span>';
  const catTag = t.category ? '<span class="tag tag-freq">' + esc(t.category) + '</span>' : '';

  const notesLine = t.notes
    ? '<div class="task-note">' + esc(t.notes.length > 80 ? t.notes.slice(0, 80) + '…' : t.notes) + '</div>'
    : '';

  const subs     = t.subtasks ? Object.values(t.subtasks) : [];
  const subsDone = subs.filter(st => st.done).length;
  const subsBadge = subs.length ? '<span class="subtask-badge">' + subsDone + '/' + subs.length + '</span>' : '';
  const chevronBtn = '<button class="subtask-toggle" onclick="window.toggleSubtasks(\'' + t.id + '\')" title="Subtasks">&#9654;</button>';

  let subRows = '';
  subs.forEach(st => {
    subRows +=
      '<div class="subtask-row">' +
        '<div class="subtask-check' + (st.done ? ' checked' : '') + '" onclick="window.toggleSubtask(\'' + t.id + '\',\'' + st.id + '\')">' +
          '<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</div>' +
        '<span class="subtask-name' + (st.done ? ' done' : '') + '">' + esc(st.name) + '</span>' +
        '<button class="subtask-del" onclick="window.removeSubtask(\'' + t.id + '\',\'' + st.id + '\')" title="Remove">×</button>' +
      '</div>';
  });
  const subtaskSection =
    '<div class="subtask-list">' +
      subRows +
      '<div class="subtask-add">' +
        '<input type="text" placeholder="Add subtask..." maxlength="60" onkeydown="if(event.key===\'Enter\')window.addSubtask(\'' + t.id + '\')" />' +
        '<button onclick="window.addSubtask(\'' + t.id + '\')">+ Add</button>' +
      '</div>' +
    '</div>';

  const isSelected = selectMode && selectedIds.has(t.id);
  const cardClass  = 'task-card ' + s + (isSelected ? ' selected' : '');
  const cardClick  = selectMode ? ' onclick="window.toggleSelect(\'' + t.id + '\')"' : '';
  const checkEl    = selectMode
    ? '<div class="sel-box" onclick="event.stopPropagation();window.toggleSelect(\'' + t.id + '\')"><svg width="10" height="10" viewBox="0 0 12 12" fill="none" style="display:' + (isSelected ? 'block' : 'none') + '"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
    : '<div class="check' + (t.done ? ' checked' : '') + '" onclick="window.toggleTask(\'' + t.id + '\')">' +
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</div>';

  return '<div class="' + cardClass + '" id="tc-' + t.id + '" draggable="' + (!selectMode) + '" data-id="' + t.id + '"' + cardClick + '>' +
    '<div class="card-main">' +
      checkEl +
      '<div class="card-info">' +
        '<span class="task-name">' + esc(t.name) + subsBadge + '</span>' +
        notesLine +
      '</div>' +
      '<div class="task-meta">' + dueTag + diffTag + freqTag + catTag + personTag + '</div>' +
      chevronBtn +
      '<button class="edit-btn" onclick="window.editTask(\'' + t.id + '\')" title="Edit">✎</button>' +
      '<button class="del" onclick="window.deleteTask(\'' + t.id + '\')" title="Remove">×</button>' +
    '</div>' +
    '<div class="subtask-section">' + subtaskSection + '</div>' +
  '</div>';
}

// ── Internal helper ───────────────────────────────────────────────────────────

function _visibleTasks() {
  const all = Object.values(state.tasks);
  if (READONLY || _isAdmin() || !_currentMember()) return all;
  const me = _currentMember();
  return all.filter(t => !t.person || t.person === me);
}

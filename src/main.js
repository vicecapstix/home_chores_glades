import './style.css';

import { onValue, ref } from 'firebase/database';

import { FB_URL, READONLY } from './config.js';
import { state, getMembers, applySnapshot, migrateLegacyMembers } from './state.js';
import { esc } from './utils.js';
import { initFirebase, initAuth } from './firebase.js';
import { initModalBackButton, closeModal } from './modals.js';
import { popUndo } from './undo.js';

import {
  showToast, toggleTheme, syncThemeButton,
  openLeaderboard, setLbTab,
  openStats, setStatsTab, exportCSV,
  openTemplates, saveTemplate, applyTemplate, deleteTemplate,
  closeSummary, summaryLetsGo, maybeShowDailySummary,
  openSetPin, closeSetPin, setPinKey, setPinDel,
} from './ui.js';

import {
  currentMember, isAdmin, handleFirstLoad,
  memberSelect, memberPinKey, memberPinDel, memberPinBack,
  switchUser,
} from './auth.js';

import {
  checkTaskResets,
  addTask, editTask, saveTask,
  toggleTask, deleteTask,
  toggleSubtasks, toggleSubtask, addSubtask, removeSubtask,
  claimTask, initDragDrop,
} from './tasks.js';

import { addMember, removeMember, toggleRole } from './members.js';

import {
  initRender, render, cardHTML,
  setFilter, setCatFilter,
  toggleSelectMode, toggleSelect,
  bulkAssign, bulkDelete,
  initMemberChipClicks,
} from './render.js';

import { requestNotificationPermission } from './notifications.js';

// ── Bound session helpers ─────────────────────────────────────────────────────
const _isAdmin       = () => isAdmin();
const _currentMember = () => currentMember();

// ── Init render with session helpers ──────────────────────────────────────────
initRender(_isAdmin, _currentMember);

// ── READONLY mode setup ───────────────────────────────────────────────────────
if (READONLY) {
  document.getElementById('pin-screen').classList.add('hidden');
  document.body.setAttribute('data-role', 'member');
  document.body.setAttribute('data-readonly', '1');
  document.getElementById('readonly-banner').classList.remove('hidden');
}

// ── Theme sync on load ────────────────────────────────────────────────────────
syncThemeButton();

// ── Modal back-button support ─────────────────────────────────────────────────
initModalBackButton();

// ── Bootstrap: auth → Firebase listener ──────────────────────────────────────
(async () => {
  const { app, db } = initFirebase();
  await initAuth(); // anonymous auth (gracefully degrades if not enabled)
  let firstLoad = true;

  onValue(ref(db, 'state'), snap => {
    const val = snap.val() || {};
    applySnapshot({
      members:   migrateLegacyMembers(val.members),
      tasks:     val.tasks     || {},
      history:   val.history   || [],
      nextId:    val.nextId    || 1,
      templates: val.templates || {},
    });

    checkTaskResets();
    render();

    if (firstLoad) {
      firstLoad = false;
      if (!READONLY) {
        handleFirstLoad(() => {
          requestNotificationPermission();
          maybeShowDailySummary();
          render(); // re-render with correct role
        });
      }
    }
  }, err => {
    showToast('DB error: ' + (err.code || err.message));
    console.error('Firebase read error:', err);
  });
})();

// ── DOM event listeners ───────────────────────────────────────────────────────
document.getElementById('new-task').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
document.getElementById('new-member').addEventListener('keydown', e => { if (e.key === 'Enter') addMember(_isAdmin); });

initMemberChipClicks(name => removeMember(name, _isAdmin));

// Filter events from summary "Let's go" button
window.addEventListener('fc:setfilter', e => setFilter(e.detail));

initDragDrop();

// ── window handlers (called from inline onclick in HTML strings) ───────────────

// Auth / member login
window.memberSelect  = name  => memberSelect(name);
window.memberPinKey  = digit => memberPinKey(digit);
window.memberPinDel  = ()    => memberPinDel();
window.memberPinBack = ()    => memberPinBack();
window.switchUser    = ()    => switchUser(window._fcLoginCallback);

// Theme & misc
window.toggleTheme   = ()    => toggleTheme();
window.toggleNewNote = function() {
  const ta = document.getElementById('new-notes');
  ta.style.display = ta.style.display === 'none' ? '' : 'none';
  if (ta.style.display !== 'none') ta.focus();
};

// Tasks
window.addTask       = ()         => addTask();
window.editTask      = id         => editTask(id);
window.saveTask      = id         => saveTask(id);
window.cancelEdit    = function(id) {
  const t    = state.tasks[id];
  const card = document.getElementById('tc-' + id);
  if (t && card) card.outerHTML = cardHTML(t);
};
window.toggleTask    = id         => toggleTask(id, _currentMember, _isAdmin);
window.deleteTask    = id         => deleteTask(id);
window.toggleSubtasks = id        => toggleSubtasks(id);
window.toggleSubtask  = (tid,sid) => toggleSubtask(tid, sid);
window.addSubtask     = id        => addSubtask(id);
window.removeSubtask  = (tid,sid) => removeSubtask(tid, sid);
window.claimTask      = id        => claimTask(id, _currentMember);

// Undo
window.popUndo        = ()        => popUndo();

// Filters
window.setFilter     = f          => setFilter(f);
window.setCatFilter  = c          => setCatFilter(c);

// Select / Bulk
window.toggleSelectMode = ()      => toggleSelectMode();
window.toggleSelect     = id      => toggleSelect(id);
window.bulkAssign       = ()      => bulkAssign();
window.bulkDelete       = ()      => bulkDelete();

// Members
window.addMember     = ()         => addMember(_isAdmin);
window.removeMember  = name       => removeMember(name, _isAdmin);
window.toggleRole    = name       => toggleRole(name, _isAdmin);

// Admin panel
window.openAdminPanel = function() {
  if (READONLY || !_isAdmin()) return;
  document.getElementById('admin-panel-name').textContent = _currentMember() || 'Admin';
  const members = getMembers();
  document.getElementById('admin-member-list').innerHTML = members.map(m => {
    const role = state.members[m]?.role || 'member';
    const isAdm = role === 'admin';
    return '<div class="admin-member-row">' +
      '<span class="admin-member-name">' + esc(m) + '</span>' +
      '<span class="admin-member-role' + (isAdm ? ' is-admin' : '') + '">' + (isAdm ? '👑 Admin' : 'Member') + '</span>' +
      '<button class="btn-sm" onclick="window.toggleRole(\'' + esc(m) + '\');window.openAdminPanel()">Toggle</button>' +
      '<button class="btn-sm" onclick="window.closeAdminPanel();window.openSetPin(\'' + esc(m) + '\')">Set PIN</button>' +
      '</div>';
  }).join('');
  document.getElementById('admin-panel-modal').classList.remove('hidden');
};
window.closeAdminPanel = function() {
  document.getElementById('admin-panel-modal').classList.add('hidden');
};
window.adminPanelSwitchUser = function() {
  window.closeAdminPanel();
  window.switchUser();
};

// Modals
window.closeModal    = id         => closeModal(id);

// Set PIN
window.openSetPin    = function(name) { if (!_isAdmin()) return; openSetPin(name); };
window.closeSetPin   = ()         => closeSetPin();
window.setPinKey     = digit      => setPinKey(digit);
window.setPinDel     = ()         => setPinDel();

// Leaderboard
window.openLeaderboard = ()       => openLeaderboard();
window.setLbTab        = (tab,btn)=> setLbTab(tab, btn);

// Stats
window.openStats     = ()         => openStats();
window.setStatsTab   = (tab,btn)  => setStatsTab(tab, btn);
window.exportCSV     = (f,t)      => exportCSV(f, t);

// Templates
window.openTemplates  = ()        => openTemplates();
window.saveTemplate   = ()        => saveTemplate();
window.applyTemplate  = id        => applyTemplate(id);
window.deleteTemplate = id        => deleteTemplate(id);

// Summary
window.closeSummary   = ()        => closeSummary();
window.summaryLetsGo  = ()        => summaryLetsGo();

import { adjustBonus, BONUS_MAX, BONUS_REASON_MAX } from './bonus.js';
import './style.css';

import { onValue, ref } from 'firebase/database';
import { watchConnection, markSynced } from './connection.js';

import { FB_URL, READONLY } from './config.js';
import { state, getMembers, applySnapshot, migrateLegacyMembers } from './state.js';
import { esc, jsq, avatarPrefix, AVATARS } from './utils.js';
import { initFirebase, initAuth, describeAuthFailure, setWritesEnabled, setAuthChangeHandler, parentSignIn, parentSignOut } from './firebase.js';
import { initModalBackButton, openModal, closeModal } from './modals.js';
import { initDialogA11y } from './a11y.js';
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
  currentMember, isAdmin, handleFirstLoad, completeParentLogin,
  memberSelect, memberPinKey, memberPinDel, memberPinBack,
  switchUser,
} from './auth.js';

import {
  checkTaskResets,
  addTask, editTask, saveTask,
  toggleTask, deleteTask,
  toggleSubtasks, toggleSubtask, addSubtask, removeSubtask,
  claimTask, moveTask, skipTask, clearDoneOnes,
} from './tasks.js';

import { checkPauseExpiry, renderPauseBanner, setPause, clearPause, pauseAdminHTML } from './pause.js';
import { addMember, backfillColors, removeMember, toggleRole, setAvatar, renameMember } from './members.js';

import {
  initRender, render, cardHTML,
  setFilter, setCatFilter,
  toggleSelectMode, toggleSelect,
  bulkAssign, bulkDelete,
  initMemberChipClicks,
} from './render.js';

import { initNotifications, enableNotifications } from './notifications.js';

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

import { initTvMode } from './tv.js';
import { startRollover } from './rollover.js';
import { registerServiceWorker } from './pwa.js';
import { downloadBackup } from './backup.js';
import { saveSnapshot, loadSnapshot, clearSnapshot, setCacheBanner } from './cache.js';
import { openHistory, setHistoryFilter, historyFilterClick } from './history.js';
import { requestReward, decideRequest, markGiven } from './redemptions.js';
import { openRewards, saveReward, editReward, deleteReward, cancelRewardEdit, refreshRewards, setGoalFor, pickGoalTarget } from './rewards.js';
registerServiceWorker();
initTvMode();
startRollover(render);

// ── Theme sync on load ────────────────────────────────────────────────────────
syncThemeButton();

// ── Modal back-button support ─────────────────────────────────────────────────
initModalBackButton();
initDialogA11y();

// ── Bootstrap: auth → Firebase listener ──────────────────────────────────────
(async () => {
  const { app, db } = initFirebase();
  // Show last-known data immediately (read-only) until the first live snapshot arrives
  const cached = loadSnapshot();
  if (cached) {
    setWritesEnabled(false);
    applySnapshot({ ...cached, members: migrateLegacyMembers(cached.members) });
    setCacheBanner(true);
    render();
    renderPauseBanner();
  }
  const authRes = await initAuth(); // wait for the token before listening
  if (!authRes.ok) showToast(describeAuthFailure(authRes));
  let firstLoad = true;
  watchConnection(db, { onValue, ref });
  // /admins {uid: name}: readable when signed in, never client-writable (#97)
  onValue(ref(db, 'admins'), snap => { state.admins = snap.val() || null; render(); },
    () => { state.admins = null; });
  setAuthChangeHandler(() => render());

  onValue(ref(db, 'state'), snap => {
    const val = snap.val() || {};
    applySnapshot({
      members:   migrateLegacyMembers(val.members),
      tasks:     val.tasks     || {},
      history:   val.history   || [],
      nextId:    val.nextId    || 1,
      templates: val.templates || {},
      rewards:   val.rewards   || {},
      redemptions: val.redemptions || {},
      pause: val.pause || null,
    });

    setWritesEnabled(true);
    setCacheBanner(false);
    saveSnapshot(state);
    checkPauseExpiry();
    checkTaskResets();
    render();
    renderPauseBanner();
    refreshRewards(_isAdmin);
    markSynced();

    if (firstLoad) {
      firstLoad = false;
      if (!READONLY) {
        handleFirstLoad(() => {
          initNotifications(_currentMember);
          maybeShowDailySummary();
          render(); // re-render with correct role
          backfillColors(_isAdmin);
        });
      }
    }
  }, err => {
    showToast(/permission/i.test(err.code || err.message || '') && !authRes.ok
      ? describeAuthFailure(authRes)
      : 'DB error: ' + (err.code || err.message));
    console.error('Firebase read error:', err);
  });
})();

// ── DOM event listeners ───────────────────────────────────────────────────────
document.getElementById('new-freq').addEventListener('change', e => { document.getElementById('new-days').classList.toggle('hidden', e.target.value !== 'weekdays'); document.getElementById('new-interval').classList.toggle('hidden', e.target.value !== 'interval'); });
document.getElementById('new-task').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(_isAdmin); });
document.getElementById('new-member').addEventListener('keydown', e => { if (e.key === 'Enter') addMember(_isAdmin); });

initMemberChipClicks(name => removeMember(name, _isAdmin, _currentMember, () => window.switchUser()));

// Filter events from summary "Let's go" button
// Keyboard entry for the PIN pads (digits + Backspace)
document.addEventListener('keydown', e => {
  const vis = id => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden'); };
  if (vis('pin-member-pin')) {
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); window.memberPinKey(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); window.memberPinDel(); }
  } else if (vis('setpin-modal')) {
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); window.setPinKey(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); window.setPinDel(); }
  }
});
window.addEventListener('fc:setfilter', e => setFilter(e.detail));


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
window.enableNotifications = () => enableNotifications();
window.addTask       = ()         => addTask(_isAdmin);
window.editTask      = id         => editTask(id, _isAdmin);
window.saveTask      = id         => saveTask(id, _isAdmin);
window.cancelEdit    = function(id) {
  const t    = state.tasks[id];
  const card = document.getElementById('tc-' + id);
  if (t && card) card.outerHTML = cardHTML(t);
};
window.toggleTask    = id         => toggleTask(id, _currentMember, _isAdmin);
window.deleteTask    = id         => deleteTask(id, _isAdmin);
window.moveTask      = (id, dir)  => moveTask(id, dir, _isAdmin);
window.clearDoneOnes = ()         => clearDoneOnes(_isAdmin);
window.skipTask      = id         => skipTask(id, _isAdmin);
window.toggleReorder = ()         => {
  const on = document.body.toggleAttribute('data-reorder');
  document.getElementById('btn-reorder')?.setAttribute('aria-pressed', String(on));
};
window.toggleSubtasks = id        => toggleSubtasks(id);
window.toggleSubtask  = (tid,sid) => toggleSubtask(tid, sid, _currentMember, _isAdmin);
window.addSubtask     = id        => addSubtask(id, _isAdmin);
window.removeSubtask  = (tid,sid) => removeSubtask(tid, sid, _isAdmin);
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
window.removeMember  = name       => removeMember(name, _isAdmin, _currentMember, () => window.switchUser());
window.toggleRole    = name       => toggleRole(name, _isAdmin);
window.setAvatar     = (name, a)  => setAvatar(name, a, _isAdmin);
window.renameMember  = async name => {
  if (READONLY || !_isAdmin()) return;
  const n = prompt('Rename ' + name + ' to (points, PIN and history are kept):', name);
  if (n !== null && await renameMember(name, n, _isAdmin)) window.openAdminPanel();
};

// Admin panel
window.openAdminPanel = function() {
  if (READONLY || !_isAdmin()) return;
  document.getElementById('admin-panel-name').textContent = _currentMember() || 'Admin';
  const members = getMembers();
  document.getElementById('admin-member-list').innerHTML = members.map(m => {
    const role = state.members[m]?.role || 'member';
    const isAdm = role === 'admin';
    return '<div class="admin-member-row">' +
      '<span class="admin-member-name">' + esc(avatarPrefix(state.members[m])) + esc(m) + '</span>' +
      '<select class="admin-avatar" aria-label="Avatar for ' + esc(m) + '" onchange="window.setAvatar(\'' + jsq(m) + '\', this.value)">' +
        '<option value="">No avatar</option>' +
        AVATARS.map(a => '<option value="' + a + '"' + (state.members[m]?.avatar === a ? ' selected' : '') + '>' + a + '</option>').join('') +
      '</select>' +
      '<span class="admin-member-role' + (isAdm ? ' is-admin' : '') + '">' + (isAdm ? '👑 Admin' : 'Member') + '</span>' +
      '<button class="btn-sm" onclick="window.toggleRole(\'' + jsq(m) + '\');window.openAdminPanel()">Toggle</button>' +
      '<button class="btn-sm" aria-label="Rename ' + esc(m) + '" onclick="window.renameMember(\'' + jsq(m) + '\')">Rename</button>' +
      '<button class="btn-sm" onclick="window.closeAdminPanel();window.openSetPin(\'' + jsq(m) + '\')">Set PIN</button>' +
      '<button class="btn-sm" aria-label="Adjust points for ' + esc(m) + '" onclick="window.adjustBonus(\'' + jsq(m) + '\')">± Points</button>' +
      '</div>';
  }).join('') + pauseAdminHTML();
  document.getElementById('admin-parent-in').classList.toggle('hidden', !!state.parentEmail);
  document.getElementById('admin-parent-out').classList.toggle('hidden', !state.parentEmail);
  openModal('admin-panel-modal');
};
window.setPause = () => { const el = document.getElementById('pause-until'); return setPause(el && el.value, _isAdmin, _currentMember).then(() => window.openAdminPanel()); };
window.clearPause = () => clearPause(_isAdmin).then(() => window.openAdminPanel());
// Parent sign in (#97)
window.openParentSignIn = function() {
  if (READONLY) return;
  document.getElementById('parent-error').textContent = '';
  openModal('parent-modal');
  const em = document.getElementById('parent-email'); if (em) em.focus();
};
window.closeParentSignIn = function() {
  document.getElementById('parent-password').value = '';
  closeModal('parent-modal');
};
window.submitParentSignIn = async function() {
  if (READONLY) return;
  const res = await parentSignIn(document.getElementById('parent-email').value, document.getElementById('parent-password').value);
  if (!res.ok) { document.getElementById('parent-error').textContent = res.message; showToast(res.message); return; }
  document.getElementById('parent-email').value = '';
  window.closeParentSignIn();
  const wasLogin = !document.getElementById('pin-screen').classList.contains('hidden');
  window.closeAdminPanel();
  showToast('Signed in as parent');
  if (wasLogin) {
    // uid arrives via onAuthStateChanged; wait a tick so state.uid is set
    setTimeout(() => completeParentLogin(), 0);
  }
};
window.parentSignOut = async function() {
  if (READONLY) return;
  const res = await parentSignOut();
  showToast(res.ok ? 'Signed out' : (res.message || 'Could not sign out'));
  window.closeAdminPanel();
};
window.closeAdminPanel = function() {
  closeModal('admin-panel-modal');
};
window.clearSavedData = function() {
  clearSnapshot();
  showToast('Saved data cleared on this device');
};
window.downloadBackup = function() { downloadBackup(_isAdmin); };
window.adminPanelSwitchUser = function() {
  window.closeAdminPanel();
  window.switchUser();
};

// Modals
window.closeModal    = id         => closeModal(id);

// Bonus / deduction points
window.adjustBonus = async function(name) {
  if (READONLY || !_isAdmin()) return;
  const a = (prompt('Points for ' + name + ' (-' + BONUS_MAX + ' to +' + BONUS_MAX + '):') || '').trim();
  if (!a) return;
  const reason = prompt('Reason (max ' + BONUS_REASON_MAX + ' characters):');
  if (reason === null) return;
  await adjustBonus(name, Number(a), reason, _isAdmin, _currentMember);
};

// Set PIN
window.openSetPin    = function(name) { if (READONLY || !_isAdmin()) return; openSetPin(name); };
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

// Activity history (read-only)
window.openHistory      = ()      => openHistory();
window.setHistoryFilter = m       => setHistoryFilter(m);
window.historyFilterClick = e    => historyFilterClick(e);

// Rewards catalog (everyone can browse; admin-only edits are guarded in rewards.js)
window.openRewards       = ()     => openRewards(_isAdmin, _currentMember);
window.requestReward     = id     => requestReward(id, _currentMember);
window.approveRedemption = id     => decideRequest(id, 'approved', _isAdmin, _currentMember);
window.denyRedemption    = id     => decideRequest(id, 'denied', _isAdmin, _currentMember);
window.markRewardGiven   = id     => markGiven(id, _isAdmin, _currentMember);
window.saveReward        = ()     => saveReward(_isAdmin);
window.editReward        = id     => editReward(id, _isAdmin);
window.deleteReward      = id     => deleteReward(id, _isAdmin);
window.cancelRewardEdit  = ()     => cancelRewardEdit();
window.setGoal           = id     => setGoalFor(id, _isAdmin, _currentMember);
window.pickGoalTarget    = name   => pickGoalTarget(name);

// Templates
window.openTemplates  = ()        => openTemplates();
window.saveTemplate   = ()        => saveTemplate();
window.applyTemplate  = id        => applyTemplate(id);
window.deleteTemplate = id        => deleteTemplate(id);

// Summary
window.closeSummary   = ()        => closeSummary();
window.summaryLetsGo  = ()        => summaryLetsGo();

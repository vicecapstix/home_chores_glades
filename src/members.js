import { state, getMembers, nextColorIdx } from './state.js';
import { READONLY, PCOLS } from './config.js';
import { patchMember, patchPaths } from './firebase.js';
import { showToast } from './ui.js';
import { writeBlocked } from './writegate.js';
import { getWeekStart, AVATARS } from './utils.js';

export const MAX_MEMBER_NAME = 30;

// Names are Firebase keys, so they can't contain . # $ [ ] /
export function validateMemberName(name) {
  if (/[.#$[\]/]/.test(name)) return "Names can't contain . # $ [ ] /";
  if (name.length > MAX_MEMBER_NAME) return 'Name must be 1–' + MAX_MEMBER_NAME + ' characters';
  return '';
}

// ── Add / Remove ──────────────────────────────────────────────────────────────

export async function addMember(isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const inp  = document.getElementById('new-member');
  const name = inp.value.trim();
  if (!name || state.members[name]) return;
  const nameError = validateMemberName(name);
  if (nameError) { showToast(nameError); return; }
  const isFirst = Object.keys(state.members).length === 0;
  state.members[name] = {
    name, role: isFirst ? 'admin' : 'member',
    pinHash: '', points: 0, weekPoints: 0, weekStart: getWeekStart(),
    streak: 0, lastStreakDate: null,
    badges: [], completedCount: 0,
    colorIdx: nextColorIdx(),
  };
  inp.value = '';
  try {
    await patchPaths({ ['members/' + name]: state.members[name] });
  } catch (err) {
    showToast('Save failed: ' + (err.code || err.message));
  }
}

// Admin, once per page load: give members that lack a colorIdx the colour they show today,
// in one multi-path update, so nobody's colour changes afterwards (#166).
let _colorsBackfilled = false;
export async function backfillColors(isAdminFn) {
  if (READONLY || _colorsBackfilled || !isAdminFn()) return;
  const names = Object.values(state.members).map(m => m.name);
  const paths = {};
  names.forEach((n, i) => {
    if (!Number.isInteger(state.members[n].colorIdx)) paths['members/' + n + '/colorIdx'] = i % PCOLS.length;
  });
  _colorsBackfilled = true;
  if (!Object.keys(paths).length) return;
  try {
    await patchPaths(paths);
  } catch (err) {
    _colorsBackfilled = false;
    console.error('Colour backfill failed:', err);
  }
}

export async function removeMember(name, isAdminFn, currentMemberFn, onSelfRemoved) {
  if (READONLY || !isAdminFn()) return;
  const m = state.members[name];
  if (!m) return;
  const others = Object.keys(state.members).length - 1;
  if (m.role === 'admin' && others > 0 &&
      Object.values(state.members).filter(x => x.role === 'admin').length <= 1) {
    showToast('Cannot remove the last admin');
    return;
  }
  if (!confirm('Remove ' + name + '? Their chores become unassigned.')) return;
  const wasSelf = !!currentMemberFn && currentMemberFn() === name;
  delete state.members[name];
  const paths = { ['members/' + name]: null };
  Object.values(state.tasks).forEach(t => {
    if (t.person === name) { t.person = ''; paths['tasks/' + t.id + '/person'] = ''; }
    if (t.rotation) {
      const left = Object.values(t.rotation).filter(n => n !== name);
      if (left.length === Object.values(t.rotation).length) return;
      if (left.length >= 2) t.rotation = left; else delete t.rotation;
      paths['tasks/' + t.id + '/rotation'] = t.rotation || null;
    }
  });
  // Pending requests held points for a member who is gone: drop them (no refund).
  Object.entries(state.redemptions || {}).forEach(([id, r]) => {
    if (r && r.member === name && r.status === 'pending') { delete state.redemptions[id]; paths['redemptions/' + id] = null; }
  });
  try {
    await patchPaths(paths);
    if (wasSelf && onSelfRemoved) onSelfRemoved();
  } catch (err) {
    showToast('Save failed: ' + (err.code || err.message));
  }
}

export async function setAvatar(name, avatar, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  if (!state.members[name]) return;
  if (avatar && !AVATARS.includes(avatar)) return;
  try {
    await patchMember(name, { avatar: avatar || null });
  } catch (err) {
    showToast('Update failed: ' + (err.code || err.message));
  }
}

// Returns true when the role was written. Demoting yourself asks first (#168).
export async function toggleRole(name, isAdminFn, currentMemberFn) {
  if (READONLY || !isAdminFn()) return false;
  const m = state.members[name];
  if (!m) return false;
  if (m.role === 'admin' && Object.values(state.members).filter(x => x.role === 'admin').length <= 1) {
    showToast('Cannot demote the last admin');
    return false;
  }
  if (m.role === 'admin' && currentMemberFn && currentMemberFn() === name &&
      !confirm("Demote yourself? You'll lose admin on this device.")) return false;
  try {
    await patchMember(name, { role: m.role === 'admin' ? 'member' : 'admin' });
    return true;
  } catch (err) {
    showToast('Update failed: ' + (err.code || err.message));
    return false;
  }
}

// Admin Panel "Toggle": wait for the write, then refresh the panel, or close it when the
// signed-in member just lost admin (their controls would silently do nothing).
export async function toggleRoleInPanel(name, isAdminFn, currentMemberFn, reopenPanel, closePanel) {
  await toggleRole(name, isAdminFn, currentMemberFn);
  if (READONLY) return;
  if (isAdminFn()) { reopenPanel(); return; }
  closePanel();
  showToast('You are no longer an admin on this device');
}

// Build the single multi-path update that moves a member to a new name.
// The member record (incl. pinHash, points, avatar) is copied unchanged.
export function renamePaths(oldName, newName) {
  const paths = {};
  paths['members/' + oldName] = null;
  paths['members/' + newName] = { ...state.members[oldName], name: newName };
  Object.values(state.tasks).forEach(t => {
    if (t.person === oldName) paths['tasks/' + t.id + '/person'] = newName;
    if (t.lastDoneBy === oldName) paths['tasks/' + t.id + '/lastDoneBy'] = newName;
    if (t.rotation && Object.values(t.rotation).includes(oldName)) {
      paths['tasks/' + t.id + '/rotation'] = Object.values(t.rotation).map(n => n === oldName ? newName : n);
    }
  });
  state.history.forEach((e, i) => {
    if (e && e.person === oldName) paths['history/' + i + '/person'] = newName;
  });
  Object.entries(state.redemptions || {}).forEach(([id, r]) => {
    if (r && r.member === oldName) paths['redemptions/' + id + '/member'] = newName;
    if (r && r.decidedBy === oldName) paths['redemptions/' + id + '/decidedBy'] = newName;
  });
  return paths;
}

export async function renameMember(oldName, newName, isAdminFn) {
  if (READONLY || !isAdminFn()) return false;
  if (writeBlocked(showToast)) return false;
  newName = (newName || '').trim();
  if (!state.members[oldName] || !newName || newName === oldName) return false;
  if (state.members[newName]) { showToast('That name is already taken'); return false; }
  const nameError = validateMemberName(newName);
  if (nameError) { showToast(nameError); return false; }
  // Move this device's session first: the local snapshot can fire before the write resolves (#164).
  let moved = false;
  try { if (sessionStorage.getItem('fc_member') === oldName) { sessionStorage.setItem('fc_member', newName); moved = true; } } catch (e) {}
  try {
    await patchPaths(renamePaths(oldName, newName));
  } catch (err) {
    try { if (moved) sessionStorage.setItem('fc_member', oldName); } catch (e) {}
    showToast('Rename failed: ' + (err.code || err.message));
    return false;
  }
  return true;
}

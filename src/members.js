import { state, getMembers } from './state.js';
import { READONLY } from './config.js';
import { writeState, patchMember, patchPaths } from './firebase.js';
import { showToast } from './ui.js';
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
  };
  inp.value = '';
  try {
    await writeState();
  } catch (err) {
    showToast('Save failed: ' + (err.code || err.message));
  }
}

export async function removeMember(name, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  if (!confirm('Remove ' + name + '? Their chores become unassigned.')) return;
  delete state.members[name];
  Object.values(state.tasks).forEach(t => { if (t.person === name) t.person = ''; });
  try {
    await writeState();
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

export async function toggleRole(name, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const m = state.members[name];
  if (!m) return;
  if (m.role === 'admin' && Object.values(state.members).filter(x => x.role === 'admin').length <= 1) {
    showToast('Cannot demote the last admin');
    return;
  }
  try {
    await patchMember(name, { role: m.role === 'admin' ? 'member' : 'admin' });
  } catch (err) {
    showToast('Update failed: ' + (err.code || err.message));
  }
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
  newName = (newName || '').trim();
  if (!state.members[oldName] || !newName || newName === oldName) return false;
  if (state.members[newName]) { showToast('That name is already taken'); return false; }
  const nameError = validateMemberName(newName);
  if (nameError) { showToast(nameError); return false; }
  try {
    await patchPaths(renamePaths(oldName, newName));
  } catch (err) {
    showToast('Rename failed: ' + (err.code || err.message));
    return false;
  }
  try { if (sessionStorage.getItem('fc_member') === oldName) sessionStorage.setItem('fc_member', newName); } catch (e) {}
  return true;
}

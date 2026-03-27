import { state, getMembers } from './state.js';
import { READONLY } from './config.js';
import { writeState, patchMember } from './firebase.js';
import { showToast } from './ui.js';

// ── Add / Remove ──────────────────────────────────────────────────────────────

export async function addMember(isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const inp  = document.getElementById('new-member');
  const name = inp.value.trim();
  if (!name || state.members[name]) return;
  const isFirst = Object.keys(state.members).length === 0;
  state.members[name] = {
    name, role: isFirst ? 'admin' : 'member',
    pinHash: '', points: 0, streak: 0, lastStreakDate: null,
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
  delete state.members[name];
  Object.values(state.tasks).forEach(t => { if (t.person === name) t.person = ''; });
  try {
    await writeState();
  } catch (err) {
    showToast('Save failed: ' + (err.code || err.message));
  }
}

export async function toggleRole(name) {
  if (READONLY) return;
  const m = state.members[name];
  if (!m) return;
  try {
    await patchMember(name, { role: m.role === 'admin' ? 'member' : 'admin' });
  } catch (err) {
    showToast('Update failed: ' + (err.code || err.message));
  }
}

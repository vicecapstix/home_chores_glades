import { state } from './state.js';
import { READONLY } from './config.js';
import { patchRoot } from './firebase.js';
import { showToast } from './ui.js';
import { openModal } from './modals.js';
import { esc, jsq } from './utils.js';

export const MAX_REWARDS = 50;
export const MAX_NAME = 40;
export const MAX_COST = 999;
const DEFAULT_ICON = '🎁';

let editingId = '';
let adminFn = () => false;

// Validate raw form input; returns { reward } or { error }.
export function validateReward(name, cost, icon) {
  const n = String(name || '').trim().slice(0, MAX_NAME);
  if (!n) return { error: 'Reward needs a name' };
  const c = Number(cost);
  if (!Number.isInteger(c) || c < 1 || c > MAX_COST) return { error: 'Cost must be 1–' + MAX_COST + ' points' };
  const i = Array.from(String(icon || '').trim()).slice(0, 2).join('') || DEFAULT_ICON;
  return { reward: { name: n, cost: c, icon: i } };
}

export function sortedRewards(rewards) {
  return Object.values(rewards || {})
    .filter(r => r && r.id && r.name)
    .sort((a, b) => (a.cost - b.cost) || String(a.name).localeCompare(String(b.name)));
}

export function rewardsHTML(rewards, canEdit) {
  const list = sortedRewards(rewards);
  if (!list.length) return '<div class="empty">No rewards yet.' + (canEdit ? ' Add the first one below.' : '') + '</div>';
  return list.map(r =>
    '<div class="reward-row">' +
      '<span class="reward-icon" aria-hidden="true">' + esc(r.icon || DEFAULT_ICON) + '</span>' +
      '<span class="reward-name">' + esc(r.name) + '</span>' +
      '<span class="reward-cost">' + esc(String(r.cost)) + ' pts</span>' +
      (canEdit
        ? '<button class="btn-sm" aria-label="Edit ' + esc(r.name) + '" onclick="window.editReward(\'' + jsq(r.id) + '\')">Edit</button>' +
          '<button class="btn-sm" aria-label="Delete ' + esc(r.name) + '" onclick="window.deleteReward(\'' + jsq(r.id) + '\')">Delete</button>'
        : '') +
    '</div>'
  ).join('');
}

export function renderRewards() {
  const list = document.getElementById('rewards-list');
  if (!list) return;
  const canEdit = !READONLY && adminFn();
  list.innerHTML = rewardsHTML(state.rewards, canEdit);
  document.getElementById('rewards-admin')?.classList.toggle('hidden', !canEdit);
}

// Re-render live when a snapshot arrives while the modal is open.
export function refreshRewards() {
  const m = document.getElementById('rewards-modal');
  if (m && !m.classList.contains('hidden')) renderRewards();
}

export function openRewards(isAdminFn) {
  adminFn = isAdminFn || adminFn;
  cancelRewardEdit();
  renderRewards();
  openModal('rewards-modal');
}

function field(id) { return document.getElementById(id); }

export function cancelRewardEdit() {
  editingId = '';
  ['reward-name', 'reward-cost', 'reward-icon'].forEach(id => { if (field(id)) field(id).value = ''; });
  const b = field('reward-save'); if (b) b.textContent = 'Add reward';
  field('reward-cancel')?.classList.add('hidden');
}

export function editReward(id, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const r = state.rewards?.[id];
  if (!r) return;
  editingId = id;
  field('reward-name').value = r.name;
  field('reward-cost').value = r.cost;
  field('reward-icon').value = r.icon || '';
  field('reward-save').textContent = 'Save reward';
  field('reward-cancel')?.classList.remove('hidden');
  field('reward-name').focus();
}

export async function saveReward(isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const { reward, error } = validateReward(field('reward-name').value, field('reward-cost').value, field('reward-icon').value);
  if (error) { showToast(error); return; }
  if (!state.rewards) state.rewards = {};
  const isEdit = !!editingId && !!state.rewards[editingId];
  if (!isEdit && Object.keys(state.rewards).length >= MAX_REWARDS) {
    showToast('Reward limit reached (' + MAX_REWARDS + ')');
    return;
  }
  const id = isEdit ? editingId : 'r' + Date.now();
  const full = { id, ...reward };
  try {
    await patchRoot({ ['rewards/' + id]: full });
    state.rewards[id] = full;
    cancelRewardEdit();
    renderRewards();
  } catch (err) { showToast('Save failed: ' + (err.code || err.message)); }
}

export async function deleteReward(id, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const r = state.rewards?.[id];
  if (!r) return;
  if (!confirm('Delete reward "' + r.name + '"?')) return;
  try {
    await patchRoot({ ['rewards/' + id]: null });
    delete state.rewards[id];
    if (editingId === id) cancelRewardEdit();
    renderRewards();
  } catch (err) { showToast('Delete failed: ' + (err.code || err.message)); }
}

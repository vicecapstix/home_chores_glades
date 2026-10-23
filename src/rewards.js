import { state } from './state.js';
import { READONLY } from './config.js';
import { patchRoot } from './firebase.js';
import { showToast } from './ui.js';
import { openModal } from './modals.js';
import { esc, jsq, goalHTML } from './utils.js';
import { setGoal } from './savings.js';
import { pendingFor, decidedFor, toGive } from './redemptions.js';

export const MAX_REWARDS = 50;
export const MAX_NAME = 40;
export const MAX_COST = 999;
const DEFAULT_ICON = '🎁';

let editingId = '';
let adminFn = () => false;
let meFn = () => '';
let goalTarget = '';

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

// opts.me / opts.points: when set, each row gets a Request button for that member.
export function rewardsHTML(rewards, canEdit, opts = {}) {
  const list = sortedRewards(rewards);
  if (!list.length) return '<div class="empty">No rewards yet.' + (canEdit ? ' Add the first one below.' : '') + '</div>';
  return list.map(r =>
    '<div class="reward-row">' +
      '<span class="reward-icon" aria-hidden="true">' + esc(r.icon || DEFAULT_ICON) + '</span>' +
      '<span class="reward-name">' + esc(r.name) + '</span>' +
      '<span class="reward-cost">' + esc(String(r.cost)) + ' pts</span>' +
      (opts.me
        ? '<button class="btn-sm" aria-label="' + (opts.goalId === r.id ? 'Clear goal ' : 'Make goal ') + esc(r.name) + '"' +
          ' onclick="window.setGoal(\'' + (opts.goalId === r.id ? '' : jsq(r.id)) + '\')">' + (opts.goalId === r.id ? 'Clear goal' : 'Make this my goal') + '</button>' +
          '<button class="btn-sm btn-accent" aria-label="Request ' + esc(r.name) + '"' + ((opts.points || 0) < r.cost ? ' disabled' : '') +
          ' onclick="window.requestReward(\'' + jsq(r.id) + '\')">Request</button>'
        : '') +
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
  const me = READONLY ? '' : meFn();
  const target = canEdit && state.members[goalTarget] ? goalTarget : me;
  const member = target && state.members[target];
  const sel = document.getElementById('goal-target');
  if (sel) {
    sel.classList.toggle('hidden', !canEdit);
    sel.innerHTML = canEdit ? Object.keys(state.members).map(n => '<option value="' + esc(n) + '"' + (n === target ? ' selected' : '') + '>' + esc(n) + '</option>').join('') : '';
  }
  list.innerHTML = rewardsHTML(state.rewards, canEdit, member ? { me: target, points: member.points || 0, goalId: member.goalRewardId } : {});
  const pend = document.getElementById('rewards-pending');
  if (pend) {
    const mine = pendingFor(me);
    const all = pendingFor('');
    pend.innerHTML = READONLY ? '' :
      (member ? '<div class="reward-pts">' + (target === me ? 'Your' : esc(target) + "'s") + ' points: ' + esc(String(member.points || 0)) + '</div>' + goalHTML(member, state.rewards) : '') +
      (mine.length ? '<div class="reward-pending-h">Your pending requests</div>' +
        mine.map(r => '<div class="reward-row"><span class="reward-name">' + esc(r.rewardName) + '</span><span class="reward-cost">' + esc(String(r.cost)) + ' pts</span></div>').join('') : '') +
      (member ? decidedFor(me).map(r => '<div class="reward-row"><span class="reward-name">' + esc(r.rewardName) + '</span><span class="reward-status ' + esc(r.status) + '">' +
        statusText(r) + '</span></div>').join('') : '') +
      (canEdit && all.length ? '<div class="reward-pending-h">' + all.length + ' request' + (all.length === 1 ? '' : 's') + ' awaiting approval</div>' +
        all.map(r => '<div class="reward-row"><span class="reward-name">' + esc(r.member) + ' — ' + esc(r.rewardName) + '</span><span class="reward-cost">' + esc(String(r.cost)) + ' pts</span>' +
          '<button class="btn-sm btn-accent" aria-label="Approve ' + esc(r.rewardName) + ' for ' + esc(r.member) + '" onclick="window.approveRedemption(\'' + jsq(r.id) + '\')">Approve</button>' +
          '<button class="btn-sm" aria-label="Deny ' + esc(r.rewardName) + ' for ' + esc(r.member) + '" onclick="window.denyRedemption(\'' + jsq(r.id) + '\')">Deny</button></div>').join('') : '') +
      (canEdit ? toGiveHTML(toGive()) : '');
  }
  document.getElementById('rewards-admin')?.classList.toggle('hidden', !canEdit);
  updateRewardsBadge();
}

function statusText(r) {
  if (r.status === 'denied') return 'Denied — points refunded';
  return r.givenAt ? 'Given ✓ ' + new Date(r.givenAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Approved — waiting';
}

// Admin list of approved rewards still to hand over (#173).
export function toGiveHTML(list) {
  if (!list.length) return '';
  return '<div class="reward-pending-h">To give (' + list.length + ')</div>' +
    list.map(r => '<div class="reward-row"><span class="reward-name">' + esc(r.member) + ' — ' + esc(r.rewardName) + '</span>' +
      '<button class="btn-sm btn-accent" aria-label="Mark ' + esc(r.rewardName) + ' as given to ' + esc(r.member) + '" onclick="window.markRewardGiven(\'' + jsq(r.id) + '\')">Given ✓</button></div>').join('');
}

// Pending-request count on the 🎁 button (admin only).
export function updateRewardsBadge() {
  const b = document.getElementById('rewards-badge');
  if (!b) return;
  const n = !READONLY && adminFn() ? pendingFor('').length + toGive().length : 0;
  b.textContent = String(n);
  b.classList.toggle('hidden', !n);
}

// Re-render live when a snapshot arrives while the modal is open.
export function refreshRewards(isAdminFn) {
  if (isAdminFn) adminFn = isAdminFn;
  updateRewardsBadge();
  const m = document.getElementById('rewards-modal');
  if (m && !m.classList.contains('hidden')) renderRewards();
}

export function openRewards(isAdminFn, currentMemberFn) {
  adminFn = isAdminFn || adminFn;
  meFn = currentMemberFn || meFn;
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

// "Make this my goal" / "Clear goal" (rewardId ''). Admins act on the member picked in #goal-target.
export async function setGoalFor(rewardId, isAdminFn, currentMemberFn) {
  if (READONLY) return;
  const target = (isAdminFn() && state.members[goalTarget] ? goalTarget : '') || currentMemberFn();
  if (await setGoal(target, rewardId, currentMemberFn, isAdminFn)) renderRewards();
}

export function pickGoalTarget(name) { goalTarget = name; renderRewards(); }

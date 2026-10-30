import { state } from './state.js';
import { READONLY } from './config.js';
import { patchRoot, takeClaim } from './firebase.js';
import { showToast } from './ui.js';
import { adjustBonus } from './bonus.js';
import { esc, jsq } from './utils.js';

// Extra job claims (#224): a member logs an unlisted job, a parent approves points.
// Claims live at state/claims/<id> only while pending; approve/deny removes them, so the
// data stays bounded (<= MAX_PENDING_PER_MEMBER per member). Points and the history entry
// go through adjustBonus (atomic points update + one 'bonus' history entry + undo).
export const CLAIM_NAME_MAX = 60;
export const CLAIM_POINTS_MAX = 20;
export const MAX_PENDING_PER_MEMBER = 20;
const deciding = new Set();

// Returns { claim: { name, points } } or { error }.
export function validateClaim(name, points) {
  const n = String(name == null ? '' : name).trim();
  if (!n) return { error: 'Say which job you did' };
  if (n.length > CLAIM_NAME_MAX) return { error: 'Job name must be ' + CLAIM_NAME_MAX + ' characters or fewer' };
  const p = typeof points === 'string' && points.trim() === '' ? NaN : Number(points);
  if (!Number.isInteger(p) || p < 1 || p > CLAIM_POINTS_MAX) return { error: 'Points must be a whole number from 1 to ' + CLAIM_POINTS_MAX };
  return { claim: { name: n, points: p } };
}

// Oldest first; pass '' for everyone's claims.
export function pendingClaims(member) {
  return Object.values(state.claims || {})
    .filter(c => c && c.name && (!member || c.member === member))
    .sort((a, b) => (a.requestedAt || 0) - (b.requestedAt || 0));
}

export async function submitClaim(name, points, currentMemberFn) {
  if (READONLY) return false;
  const me = currentMemberFn();
  if (!me || !state.members[me]) { showToast('Select a member first'); return false; }
  const v = validateClaim(name, points);
  if (v.error) { showToast(v.error); return false; }
  if (pendingClaims(me).length >= MAX_PENDING_PER_MEMBER) { showToast('Too many waiting requests (max ' + MAX_PENDING_PER_MEMBER + ')'); return false; }
  const id = 'cl' + Date.now();
  const entry = { id, member: me, name: v.claim.name, points: v.claim.points, requestedAt: Date.now() };
  try { await patchRoot({ ['claims/' + id]: entry }); }
  catch (err) { showToast('Request failed: ' + (err.code || err.message)); return false; }
  if (!state.claims) state.claims = {};
  state.claims[id] = entry;
  showToast('Sent to a parent for approval');
  return true;
}

// Admin approves (optionally with edited points) or denies a pending claim.
export async function decideClaim(id, status, points, isAdminFn, currentMemberFn) {
  if (READONLY || !isAdminFn()) return false;
  if (status !== 'approved' && status !== 'denied') return false;
  const c = state.claims?.[id];
  if (!c || deciding.has(id)) return false;
  let pts = c.points;
  if (status === 'approved' && points !== undefined && points !== null && points !== '') {
    const v = validateClaim(c.name, points);
    if (v.error) { showToast(v.error); return false; }
    pts = v.claim.points;
  }
  deciding.add(id);
  try {
    // Remove first, atomically, so two parents (or a double tap) can never award the same claim twice.
    let taken;
    try { taken = await takeClaim(id); }
    catch (err) { showToast('Update failed: ' + (err.code || err.message)); return false; }
    if (!taken) { showToast('Not updated: already decided, or offline'); return false; }
    delete state.claims[id];
    if (status === 'denied') { showToast('Denied ' + c.name); return true; }
    if (!state.members[c.member]) { showToast(c.member + ' is no longer a member — claim removed'); return false; }
    const ok = await adjustBonus(c.member, pts, c.name, isAdminFn, currentMemberFn);
    if (!ok) {
      try { await patchRoot({ ['claims/' + id]: c }); state.claims[id] = c; } catch (e) { /* claim lost; admin was toasted */ }
      return false;
    }
    showToast('Gave ' + c.member + ' ' + pts + ' pts for ' + c.name);
    return true;
  } finally { deciding.delete(id); }
}

const rowHTML = (c, extra) => '<div class="reward-row"><span class="reward-name">' + extra.label + '</span>' +
  '<span class="reward-cost">' + esc(String(c.points)) + ' pts</span>' + (extra.actions || '') + '</div>';

export function claimsAdminHTML(list) {
  if (!list.length) return '';
  return '<div class="reward-pending-h">' + list.length + ' extra job' + (list.length === 1 ? '' : 's') + ' awaiting approval</div>' +
    list.map(c => rowHTML(c, {
      label: esc(c.member) + ' — ' + esc(c.name),
      actions: '<input type="number" class="claim-pts" id="claim-pts-' + esc(c.id) + '" aria-label="Points to give ' + esc(c.member) + '" value="' + esc(String(c.points)) + '" min="1" max="' + CLAIM_POINTS_MAX + '" inputmode="numeric" />' +
        '<button class="btn-sm btn-accent" aria-label="Approve ' + esc(c.name) + ' for ' + esc(c.member) + '" onclick="window.approveClaim(\'' + jsq(c.id) + '\')">Approve</button>' +
        '<button class="btn-sm" aria-label="Deny ' + esc(c.name) + ' for ' + esc(c.member) + '" onclick="window.denyClaim(\'' + jsq(c.id) + '\')">Deny</button>',
    })).join('');
}

export function claimsMineHTML(list) {
  if (!list.length) return '';
  return '<div class="reward-pending-h">Your extra jobs waiting for a parent</div>' +
    list.map(c => rowHTML(c, { label: esc(c.name) })).join('');
}

// Fills #claims-section and shows the member form. Called from renderRewards.
export function renderClaims(isAdminFn, me) {
  const form = document.getElementById('claim-form');
  const sec = document.getElementById('claims-section');
  const canAct = !READONLY && !!me && !!state.members[me];
  form?.classList.toggle('hidden', !canAct);
  if (!sec) return;
  const admin = !READONLY && isAdminFn();
  sec.innerHTML = READONLY ? '' : admin ? claimsAdminHTML(pendingClaims('')) : claimsMineHTML(me ? pendingClaims(me) : []);
}

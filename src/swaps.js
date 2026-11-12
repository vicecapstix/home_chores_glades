import { state } from './state.js';
import { READONLY } from './config.js';
import { patchRoot, appendHistory, removeHistoryEntry } from './firebase.js';
import { showToast } from './ui.js';
import { pushUndo } from './undo.js';
import { openModal, closeModal } from './modals.js';
import { esc, jsq } from './utils.js';

// Chore swaps (#228): a member offers one of their own pending chores to a sibling.
// Offers live at state/swaps/<id> = { id, taskId, taskName, from, to, offeredAt, lastDone }
// (lastDone = the chore's lastDone when offered, so a reset/completion expires the offer).
// Expiry is decided at read time; expired offers are cleaned up on the next write.
export const MAX_SWAPS = 50;
export const SWAP_TTL_MS = 24 * 60 * 60 * 1000;
const busy = new Set();

export function swapExpired(s, now = Date.now()) {
  const t = state.tasks?.[s.taskId];
  return !t || t.done || t.person !== s.from || (t.lastDone || 0) !== (s.lastDone || 0) ||
    !state.members?.[s.to] || !(now - s.offeredAt < SWAP_TTL_MS);
}

const all = () => Object.values(state.swaps || {}).filter(s => s && s.id);

// Live (unexpired) offers waiting for `member`, oldest first.
export function pendingSwapsFor(member, now = Date.now()) {
  return all().filter(s => s.to === member && !swapExpired(s, now)).sort((a, b) => a.offeredAt - b.offeredAt);
}

export const canOfferSwap = (t, me) => !READONLY && !!me && !t.done && t.person === me &&
  Object.keys(state.members || {}).length > 1 && !all().some(s => s.taskId === t.id && !swapExpired(s));

export async function offerSwap(taskId, toMember, currentMemberFn) {
  if (READONLY) return false;
  const me = currentMemberFn();
  const t = state.tasks?.[taskId];
  if (!me || !t || t.person !== me || t.done) { showToast('You can only offer your own pending chores'); return false; }
  if (!toMember || toMember === me || !state.members?.[toMember]) { showToast('Pick a sibling to swap with'); return false; }
  if (busy.has('o' + taskId)) return false;
  const now = Date.now();
  if (all().some(s => s.taskId === taskId && !swapExpired(s, now))) { showToast('This chore already has an open offer'); return false; }
  const stale = all().filter(s => swapExpired(s, now));
  if (all().length - stale.length >= MAX_SWAPS) { showToast('Too many open swap offers (max ' + MAX_SWAPS + ')'); return false; }
  const id = 'sw' + now;
  const entry = { id, taskId, taskName: t.name, from: me, to: toMember, offeredAt: now, lastDone: t.lastDone || 0 };
  const fields = { ['swaps/' + id]: entry };
  stale.forEach(s => { fields['swaps/' + s.id] = null; });
  busy.add('o' + taskId);
  try { await patchRoot(fields); }
  catch (err) { showToast('Offer failed: ' + (err.code || err.message)); return false; }
  finally { busy.delete('o' + taskId); }
  if (!state.swaps) state.swaps = {};
  stale.forEach(s => delete state.swaps[s.id]);
  state.swaps[id] = entry;
  showToast('Offered ' + t.name + ' to ' + toMember);
  return true;
}

export async function acceptSwap(id, currentMemberFn) {
  if (READONLY) return false;
  const s = state.swaps?.[id];
  const me = currentMemberFn();
  if (!s || !me || s.to !== me) { showToast('That offer is not for you'); return false; }
  if (busy.has(id)) return false;
  busy.add(id);
  try {
    if (swapExpired(s)) {
      try { await patchRoot({ ['swaps/' + id]: null }); delete state.swaps[id]; } catch (e) { /* cleaned up next time */ }
      showToast('That offer has expired');
      return false;
    }
    const at = Date.now();
    try { await patchRoot({ ['tasks/' + s.taskId + '/person']: me, ['swaps/' + id]: null }); }
    catch (err) { showToast('Swap failed: ' + (err.code || err.message)); return false; }
    const t = state.tasks[s.taskId];
    if (t) t.person = me;
    delete state.swaps[id];
    // type 'swap' (not a completion): no points, ignored by counts.
    const entry = { type: 'swap', taskId: s.taskId, taskName: 'Swap: ' + s.taskName + ' (' + s.from + ' → ' + me + ')', person: me, from: s.from, points: 0, completedAt: at };
    try { await appendHistory(entry); }
    catch (err) { showToast('Swapped, but the history note failed: ' + (err.code || err.message)); }
    pushUndo({
      label: 'swap ' + s.taskName, verb: 'Accepted',
      undo: async () => {
        if (state.tasks[s.taskId]?.person !== me) return;
        await patchRoot({ ['tasks/' + s.taskId + '/person']: s.from });
        await removeHistoryEntry({ type: 'swap', taskId: s.taskId, person: me, completedAt: at });
      },
    });
    showToast('You took over ' + s.taskName);
    return true;
  } finally { busy.delete(id); }
}

// Recipient declines, or the offerer cancels.
export async function declineSwap(id, currentMemberFn) {
  if (READONLY) return false;
  const s = state.swaps?.[id];
  const me = currentMemberFn();
  if (!s || !me || (s.to !== me && s.from !== me)) { showToast('That offer is not yours'); return false; }
  if (busy.has(id)) return false;
  busy.add(id);
  try { await patchRoot({ ['swaps/' + id]: null }); }
  catch (err) { showToast('Update failed: ' + (err.code || err.message)); return false; }
  finally { busy.delete(id); }
  delete state.swaps[id];
  showToast(s.to === me ? 'Declined' : 'Offer cancelled');
  return true;
}

export function swapsHTML(list) {
  if (!list.length) return '';
  return '<div class="reward-pending-h">Swap offers for you</div>' + list.map(s =>
    '<div class="reward-row"><span class="reward-name">' + esc(s.from) + ' offers ' + esc(s.taskName) + '</span>' +
    '<button class="btn-sm btn-accent" aria-label="Accept ' + esc(s.taskName) + ' from ' + esc(s.from) + '" onclick="window.acceptSwap(\'' + jsq(s.id) + '\')">Accept</button>' +
    '<button class="btn-sm" aria-label="Decline ' + esc(s.taskName) + ' from ' + esc(s.from) + '" onclick="window.declineSwap(\'' + jsq(s.id) + '\')">Decline</button></div>').join('');
}

// Called from render(); nothing is shown on the read-only TV view.
export function renderSwaps(me) {
  const sec = document.getElementById('swaps-section');
  if (sec) sec.innerHTML = READONLY || !me ? '' : swapsHTML(pendingSwapsFor(me));
}

export function openSwapPicker(taskId, currentMemberFn) {
  const me = currentMemberFn(), t = state.tasks?.[taskId];
  if (READONLY || !t || !canOfferSwap(t, me)) return;
  const sel = document.getElementById('swap-to');
  document.getElementById('swap-task-id').value = taskId;
  document.getElementById('swap-chore').textContent = t.name;
  sel.innerHTML = Object.keys(state.members).filter(n => n !== me).map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
  openModal('swap-modal');
}

export async function submitSwapPicker(currentMemberFn) {
  const ok = await offerSwap(document.getElementById('swap-task-id').value, document.getElementById('swap-to').value, currentMemberFn);
  if (ok) closeModal('swap-modal');
}

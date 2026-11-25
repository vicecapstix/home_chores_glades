// Parent cheer (#403): admin taps 👏 on a chore completion in History; the child sees it once per device.
import { state } from './state.js';
import { READONLY } from './config.js';
import { cheerHistoryEntry } from './firebase.js';
import { showToast } from './ui.js';
import { esc } from './utils.js';
import { renderHistory } from './history.js';

const KEY = 'ff_cheer_seen:';
const SEEN_MAX = 50;
const keyOf = e => e.completedAt + '|' + (e.taskId || '');

function readSeen(me) {
  try { const a = JSON.parse(localStorage.getItem(KEY + me) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function writeSeen(me, list) {
  try { localStorage.setItem(KEY + me, JSON.stringify(list.slice(-SEEN_MAX))); } catch (e) { /* storage blocked */ }
}

export function hideCheer() {
  const el = document.getElementById('cheer-banner');
  if (el) el.classList.add('hidden');
}

// Click on a 👏 button inside #history-list. Admin only; one write to one entry.
export async function cheerClick(ev, isAdminFn, currentMemberFn) {
  if (READONLY || !isAdminFn()) return;
  const btn = ev && ev.target && ev.target.closest ? ev.target.closest('[data-cheer-at]') : null;
  if (!btn) return;
  const match = { completedAt: Number(btn.dataset.cheerAt), person: btn.dataset.cheerPerson, taskId: btn.dataset.cheerTask };
  const by = currentMemberFn();
  if (!by) return;
  const idx = (state.history || []).findIndex(e => e && !e.type && e.completedAt === match.completedAt && e.person === match.person && e.taskId === match.taskId);
  if (idx < 0) { showToast('That entry is no longer in History'); return; }
  try {
    const r = await cheerHistoryEntry(idx, match, by);
    if (!r.ok || !r.cheered) { showToast('Could not cheer (already cheered or entry changed)'); return; }
    state.history[idx] = { ...state.history[idx], cheer: by };
    renderHistory();
    showToast('👏 Cheered ' + match.person);
  } catch (e) { showToast('Could not cheer: ' + e.message); }
}

// Shown on the member's next visit, once per device per cheered entry. Display only.
export function renderCheerBanner(history, me) {
  const el = document.getElementById('cheer-banner');
  if (READONLY || !me) { hideCheer(); return; }
  const seen = readSeen(me);
  const fresh = (history || []).filter(e => e && !e.type && e.person === me && e.cheer && e.cheer !== me && !seen.includes(keyOf(e)))
    .sort((a, b) => b.completedAt - a.completedAt);
  if (!fresh.length) return;
  writeSeen(me, seen.concat(fresh.map(keyOf)));
  if (!el) return;
  const e = fresh[0];
  const more = fresh.length > 1 ? ' (+' + (fresh.length - 1) + ' more)' : '';
  const t = document.getElementById('cheer-banner-text');
  if (t) t.innerHTML = '👏 ' + esc(e.cheer) + ' cheered your ' + esc(e.taskName || 'chore') + esc(more);
  el.classList.remove('hidden');
}

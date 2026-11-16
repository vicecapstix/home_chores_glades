// Data size readout (#353): admin-only, display-only. Measures the in-memory state (no Firebase reads)
// so parents can see how much every device downloads on start and stay inside the free Spark plan.
import { state } from './state.js';
import { READONLY } from './config.js';
import { openModal } from './modals.js';
import { esc } from './utils.js';

export const WARN_BYTES = 1048576; // 1 MB
export const DEVICES = 5;          // assumed family devices
export const OPENS_PER_DAY = 10;   // assumed app opens per device per day
const DB_KEYS = ['members', 'tasks', 'history', 'nextId', 'templates', 'rewards', 'redemptions', 'claims', 'swaps', 'pause', 'teamGoal', 'doublePoints', 'pocketMoney'];
const size = v => (v && typeof v === 'object' ? (Array.isArray(v) ? v.length : Object.keys(v).length) : 0);

// Pure: bytes of the database-backed state as JSON (PIN hashes left out) and collection counts.
export function stateSize(s = state) {
  const out = {};
  DB_KEYS.forEach(k => {
    if (s[k] == null) return;
    out[k] = k === 'members'
      ? Object.fromEntries(Object.entries(s.members).map(([n, m]) => [n, Object.fromEntries(Object.entries(m || {}).filter(([f]) => f !== 'pinHash'))]))
      : s[k];
  });
  return {
    bytes: new TextEncoder().encode(JSON.stringify(out)).length,
    counts: { history: size(s.history), redemptions: size(s.redemptions), templates: size(s.templates), rewards: size(s.rewards), tasks: size(s.tasks) },
  };
}

const kb = b => (b >= WARN_BYTES ? (b / WARN_BYTES).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB');

export function dataSizeHTML(info) {
  const monthly = info.bytes * DEVICES * OPENS_PER_DAY * 30;
  const c = info.counts;
  return '<div class="lb-note">Family data: <b>' + esc(kb(info.bytes)) + '</b> (' + esc(String(info.bytes)) + ' bytes, PINs not counted)</div>' +
    '<ul class="prog-list"><li>History ' + esc(c.history) + ' / 500</li><li>Redemptions ' + esc(c.redemptions) + ' / 100</li>' +
    '<li>Templates ' + esc(c.templates) + '</li><li>Rewards ' + esc(c.rewards) + '</li><li>Tasks ' + esc(c.tasks) + '</li></ul>' +
    '<div class="lb-note">About ' + esc(kb(monthly)) + ' downloaded per month, assuming ' + DEVICES + ' devices and ' + OPENS_PER_DAY +
    ' opens a day each. The free plan allows 10 GB a month.</div>' +
    (info.bytes > WARN_BYTES ? '<div class="lb-note datasize-warn" role="note">Over 1 MB: consider downloading a backup and clearing old history or redemptions.</div>' : '');
}

export function openDataSize(isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  document.getElementById('datasize-list').innerHTML = dataSizeHTML(stateSize(state));
  openModal('datasize-modal');
}

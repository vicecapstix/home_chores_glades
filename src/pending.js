// In-memory tracker of unsynced task writes (#144). No /state data, no storage.
// Firebase's offline queue keeps a write's promise pending until the server
// acknowledges it, so "promise unresolved" == "not synced yet".
import { jsq } from './utils.js';

const entries = new Map(); // taskId -> { pending: number, retry: fn|null }
let onChange = null;

export function setPendingHandler(fn) { onChange = fn; }
function changed() { if (onChange) onChange(pendingCount()); }

export function pendingCount() {
  let n = 0;
  entries.forEach(e => { n += e.pending; });
  return n;
}

export function syncState(id) {
  const e = entries.get(id);
  if (!e) return '';
  return e.pending > 0 ? 'pending' : (e.retry ? 'failed' : '');
}

// Runs op() and tracks it against a task id. Always rethrows so callers keep
// their existing error toast. A failed op can be retried via retrySync(id).
export function trackWrite(id, op) {
  const e = entries.get(id) || { pending: 0, retry: null };
  entries.set(id, e);
  e.pending++; e.retry = null;
  changed();
  const settle = (failedOp) => {
    e.pending--;
    if (failedOp) e.retry = op;
    if (e.pending <= 0 && !e.retry) entries.delete(id);
    changed();
  };
  return Promise.resolve().then(op).then(
    v => { settle(false); return v; },
    err => { settle(true); throw err; }
  );
}

export function retrySync(id) {
  const e = entries.get(id);
  if (!e || e.pending > 0 || !e.retry) return Promise.resolve(false);
  return trackWrite(id, e.retry).then(() => true, () => false);
}

export function syncTagHTML(id) {
  const s = syncState(id);
  if (s === 'pending') return '<span class="tag tag-sync" role="status" aria-label="Not synced yet">⏳ not synced</span>';
  if (s === 'failed') return '<button type="button" class="tag tag-sync tag-sync-fail" aria-label="Not saved. Tap to retry" onclick="event.stopPropagation();window.retrySync(\'' + jsq(id) + '\')">⚠ not saved — tap to retry</button>';
  return '';
}

export function _resetForTests() { entries.clear(); onChange = null; }

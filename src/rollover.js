import { state } from './state.js';
import { dueStatus } from './utils.js';
import { checkTaskResets } from './tasks.js';

// Local rollover: screens left open keep recomputing resets and due status
// without waiting for a Firebase snapshot (#88). No reads, no listeners.

function signature() {
  return Object.values(state.tasks || {})
    .map(t => t.id + ':' + (t.done ? 1 : 0) + ':' + dueStatus(t))
    .join('|');
}

// Re-render only when a task's done flag or due status differs from the last
// tick, so inline edits (#34) are not wiped by a needless full render.
export function startRollover(render, intervalMs = 60000) {
  let last = signature();
  const tick = () => {
    checkTaskResets(); // writes via patchRoot unless READONLY
    const sig = signature();
    if (sig !== last) { last = sig; render(); }
  };
  const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
  const id = setInterval(tick, intervalMs);
  document.addEventListener('visibilitychange', onVisible);
  return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
}

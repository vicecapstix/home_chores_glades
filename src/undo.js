// Command-pattern undo stack.
// Each command is { label: string, undo: async () => void }.
// Supports single deletes, bulk deletes, and any other reversible operation.

const _stack = [];
const MAX = 20;
let _toastTimer = null;

export function pushUndo({ label, undo, verb }) {
  _stack.push({ label, undo });
  if (_stack.length > MAX) _stack.shift();
  _showUndoToast(label, verb);
}

export async function popUndo() {
  _hideUndoToast();
  const cmd = _stack.pop();
  _stack.splice(0); // the undo window closed with the toast — older entries expire too
  if (!cmd) return;
  try {
    await cmd.undo();
    // showToast is imported lazily to avoid circular deps
    const { showToast } = await import('./ui.js');
    showToast('Restored');
  } catch (err) {
    const { showToast } = await import('./ui.js');
    showToast('Restore failed: ' + (err.code || err.message));
  }
}

function _showUndoToast(label, verb) {
  const el = document.getElementById('undo-toast');
  const labelEl = document.getElementById('undo-label');
  if (!el || !labelEl) return;
  labelEl.textContent = (verb || 'Deleted') + ' "' + label + '"';
  const btn = document.getElementById('undo-btn');
  if (btn) btn.setAttribute('aria-label', verb ? 'Undo ' + verb.toLowerCase() + ' ' + label : 'Undo delete of ' + label);
  if (btn) btn.disabled = false;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.classList.remove('show');
    if (btn) btn.disabled = true;
    _stack.splice(0); // expire all pending commands — the undo window has closed
  }, 5000);
}

function _hideUndoToast() {
  clearTimeout(_toastTimer);
  const el = document.getElementById('undo-toast');
  if (el) el.classList.remove('show');
  const btn = document.getElementById('undo-btn');
  if (btn) btn.disabled = true; // a hidden toast's button must not be focusable or activatable
}

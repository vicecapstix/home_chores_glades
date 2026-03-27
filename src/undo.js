// Command-pattern undo stack.
// Each command is { label: string, undo: async () => void }.
// Supports single deletes, bulk deletes, and any other reversible operation.

const _stack = [];
const MAX = 20;
let _toastTimer = null;

export function pushUndo({ label, undo }) {
  _stack.push({ label, undo });
  if (_stack.length > MAX) _stack.shift();
  _showUndoToast(label);
}

export async function popUndo() {
  _hideUndoToast();
  const cmd = _stack.pop();
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

function _showUndoToast(label) {
  const el = document.getElementById('undo-toast');
  const labelEl = document.getElementById('undo-label');
  if (!el || !labelEl) return;
  labelEl.textContent = 'Deleted "' + label + '"';
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.classList.remove('show');
    _stack.pop(); // expire the oldest pending command
  }, 5000);
}

function _hideUndoToast() {
  clearTimeout(_toastTimer);
  const el = document.getElementById('undo-toast');
  if (el) el.classList.remove('show');
}

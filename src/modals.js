// Centralised modal manager.
// Keeps a stack of open modals so the browser back-button closes the topmost one.

const _stack = [];

export function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  _stack.push(id);
  history.pushState({ fcModal: id }, '');
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
  const i = _stack.lastIndexOf(id);
  if (i !== -1) _stack.splice(i, 1);
}

export function closeTopModal() {
  if (_stack.length) closeModal(_stack[_stack.length - 1]);
}

export function closeAllModals() {
  [..._stack].forEach(id => closeModal(id));
}

// Install the popstate listener once
export function initModalBackButton() {
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.fcModal) {
      closeTopModal();
    }
  });
}

// Centralised modal manager.
// Keeps a stack of open modals so the browser back-button closes the topmost one.
// Each open modal owns exactly one history entry; closing it by any other route
// (x button, backdrop click) pops that entry so Back presses do not accumulate.

const _stack = [];
let _ignorePop = 0; // popstate events caused by our own history.back()/go()

function _hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
  const i = _stack.lastIndexOf(id);
  if (i === -1) return false;
  _stack.splice(i, 1);
  return true;
}

export function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  if (_stack.includes(id)) return; // already open (e.g. admin panel re-render)
  _stack.push(id);
  history.pushState({ fcModal: id }, '');
}

export function closeModal(id) {
  if (_hide(id) && history.state && history.state.fcModal) {
    _ignorePop++;
    history.back();
  }
}

// Used by the popstate handler: the browser already popped the entry.
function _closeTopFromPop() {
  if (_stack.length) _hide(_stack[_stack.length - 1]);
}

export function closeTopModal() {
  if (_stack.length) closeModal(_stack[_stack.length - 1]);
}

export function closeAllModals() {
  const n = _stack.length;
  [..._stack].forEach(id => _hide(id));
  if (n && history.state && history.state.fcModal) {
    _ignorePop++;
    history.go(-n);
  }
}

// Install the popstate listener once
export function initModalBackButton() {
  window.addEventListener('popstate', () => {
    if (_ignorePop > 0) { _ignorePop--; return; }
    _closeTopFromPop();
  });
}

// Dialog keyboard support: Esc closes, focus moves in/returns, Tab is trapped.
// Observes the `hidden` class so it works for every [role=dialog], however it is opened.

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const openers = new Map(); // dialog element -> element focused before it opened
let keysInstalled = false;

const isOpen = el => !el.classList.contains('hidden');
const visibleDialogs = () => [...document.querySelectorAll('[role="dialog"]')].filter(isOpen);
const focusables = dlg => [...dlg.querySelectorAll(FOCUSABLE)].filter(el => !el.closest('.hidden'));

function onChange(dlg) {
  if (isOpen(dlg)) {
    if (openers.has(dlg)) return;
    openers.set(dlg, document.activeElement);
    const f = focusables(dlg)[0] || dlg.querySelector('.lb-card') || dlg;
    if (!f.hasAttribute('tabindex') && !f.matches(FOCUSABLE)) f.setAttribute('tabindex', '-1');
    f.focus();
  } else if (openers.has(dlg)) {
    const prev = openers.get(dlg);
    openers.delete(dlg);
    if (prev && prev.isConnected && typeof prev.focus === 'function') prev.focus();
  }
}

export function initDialogA11y() {
  const obs = new MutationObserver(muts => muts.forEach(m => onChange(m.target)));
  document.querySelectorAll('[role="dialog"]').forEach(d => {
    obs.observe(d, { attributes: true, attributeFilter: ['class'] });
    if (isOpen(d)) onChange(d);
  });
  if (keysInstalled) return;
  keysInstalled = true;
  document.addEventListener('keydown', e => {
    const open = visibleDialogs();
    if (!open.length) return;
    const top = open[open.length - 1];
    if (e.key === 'Escape') {
      e.preventDefault();
      top.click(); // the backdrop's own close handler
    } else if (e.key === 'Tab') {
      const f = focusables(top);
      if (!f.length) { e.preventDefault(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !top.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !top.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
  });
}

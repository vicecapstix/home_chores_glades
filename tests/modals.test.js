import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Use dynamic imports so each test gets a fresh module (no shared _stack state)
let openModal, closeModal, closeTopModal, closeAllModals;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../src/modals.js');
  openModal      = mod.openModal;
  closeModal     = mod.closeModal;
  closeTopModal  = mod.closeTopModal;
  closeAllModals = mod.closeAllModals;

  // Minimal DOM: two modals to exercise stack logic
  document.body.innerHTML = `
    <div id="modal-a" class="hidden"></div>
    <div id="modal-b" class="hidden"></div>
    <div id="modal-c" class="hidden"></div>
  `;
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('openModal', () => {
  it('removes the "hidden" class from the target element', () => {
    openModal('modal-a');
    expect(document.getElementById('modal-a').classList.contains('hidden')).toBe(false);
  });
  it('does not affect other modal elements', () => {
    openModal('modal-a');
    expect(document.getElementById('modal-b').classList.contains('hidden')).toBe(true);
  });
  it('is a no-op when the element does not exist', () => {
    expect(() => openModal('does-not-exist')).not.toThrow();
  });
  it('opening the same modal twice does not throw', () => {
    openModal('modal-a');
    expect(() => openModal('modal-a')).not.toThrow();
  });
});

describe('closeModal', () => {
  it('adds the "hidden" class to the target element', () => {
    openModal('modal-a');
    closeModal('modal-a');
    expect(document.getElementById('modal-a').classList.contains('hidden')).toBe(true);
  });
  it('is a no-op when the element does not exist', () => {
    expect(() => closeModal('does-not-exist')).not.toThrow();
  });
  it('does not affect other modals', () => {
    openModal('modal-a');
    openModal('modal-b');
    closeModal('modal-a');
    expect(document.getElementById('modal-b').classList.contains('hidden')).toBe(false);
  });
});

describe('closeTopModal', () => {
  it('closes the most recently opened modal (LIFO order)', () => {
    openModal('modal-a');
    openModal('modal-b');
    closeTopModal();
    expect(document.getElementById('modal-b').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('modal-a').classList.contains('hidden')).toBe(false);
  });
  it('is a no-op when the stack is empty', () => {
    expect(() => closeTopModal()).not.toThrow();
  });
  it('successive calls close modals in LIFO order', () => {
    openModal('modal-a');
    openModal('modal-b');
    openModal('modal-c');
    closeTopModal(); // closes c
    closeTopModal(); // closes b
    expect(document.getElementById('modal-c').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('modal-b').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('modal-a').classList.contains('hidden')).toBe(false);
  });
});

describe('closeAllModals', () => {
  it('hides all open modals at once', () => {
    openModal('modal-a');
    openModal('modal-b');
    openModal('modal-c');
    closeAllModals();
    expect(document.getElementById('modal-a').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('modal-b').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('modal-c').classList.contains('hidden')).toBe(true);
  });
  it('is a no-op when no modals are open', () => {
    expect(() => closeAllModals()).not.toThrow();
  });
  it('stack is empty after closeAllModals — closeTopModal becomes no-op', () => {
    openModal('modal-a');
    closeAllModals();
    // Would throw or re-close if stack was not cleared
    expect(() => closeTopModal()).not.toThrow();
  });
});

describe('history sync (#37)', () => {
  beforeEach(async () => {
    const mod = await import('../src/modals.js');
    mod.initModalBackButton();
  });

  it('closing via closeModal pops its own history entry once', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {});
    openModal('modal-a');
    closeModal('modal-a');
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
  });
  it('does not call history.back when the modal was not open', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {});
    closeModal('modal-a');
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();
  });
  it('re-opening an open modal does not push another entry', () => {
    const push = vi.spyOn(history, 'pushState');
    openModal('modal-a');
    openModal('modal-a');
    expect(push).toHaveBeenCalledTimes(1);
    push.mockRestore();
  });
  it('real back button closes the top modal', () => {
    openModal('modal-a');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    expect(document.getElementById('modal-a').classList.contains('hidden')).toBe(true);
  });
  it('popstate echo of our own history.back does not close a second modal', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {});
    openModal('modal-a');
    openModal('modal-b');
    closeModal('modal-b');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    expect(document.getElementById('modal-a').classList.contains('hidden')).toBe(false);
    back.mockRestore();
  });
  it('closeAllModals unwinds history with a single go(-n)', () => {
    const go = vi.spyOn(history, 'go').mockImplementation(() => {});
    openModal('modal-a');
    openModal('modal-b');
    closeAllModals();
    expect(go).toHaveBeenCalledWith(-2);
    go.mockRestore();
  });
  it('admin panel is opened and closed through the modal manager', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/main.js', 'utf8');
    expect(src).toMatch(/openModal\('admin-panel-modal'\)/);
    expect(src).toMatch(/closeModal\('admin-panel-modal'\)/);
    expect(src).not.toMatch(/getElementById\('admin-panel-modal'\)\.classList/);
  });
});

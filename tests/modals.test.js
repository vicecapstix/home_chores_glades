import { describe, it, expect, beforeEach, afterEach } from 'vitest';

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

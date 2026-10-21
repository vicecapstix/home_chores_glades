import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/firebase.js', () => ({
  initFirebase: vi.fn(), getDb: vi.fn(), initAuth: vi.fn(), writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(),
  patchRoot: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(), onValue: vi.fn(), ref: vi.fn(),
}));

import { state } from '../src/state.js';
import { cardHTML, toggleSelectMode, toggleSelect } from '../src/render.js';
import { initDialogA11y } from '../src/a11y.js';

const task = { id: 't1', name: 'Dishes <b>', freq: 'daily', difficulty: 'easy', person: '', done: false,
  subtasks: { s1: { id: 's1', name: 'Rinse', done: true } } };

function card(t = task) {
  const wrap = document.createElement('div');
  wrap.innerHTML = cardHTML(t);
  return wrap;
}

describe('checkboxes are real, labelled buttons (#36)', () => {
  beforeEach(() => { state.members = {}; });

  it('task check is a <button role=checkbox> with aria-checked and a label', () => {
    const b = card().querySelector('.check');
    expect(b.tagName).toBe('BUTTON');
    expect(b.getAttribute('type')).toBe('button');
    expect(b.getAttribute('role')).toBe('checkbox');
    expect(b.getAttribute('aria-checked')).toBe('false');
    expect(b.getAttribute('aria-label')).toContain('Dishes <b>');
  });
  it('aria-checked reflects done state', () => {
    expect(card({ ...task, done: true }).querySelector('.check').getAttribute('aria-checked')).toBe('true');
  });
  it('subtask check is a labelled checkbox button', () => {
    const b = card().querySelector('.subtask-check');
    expect(b.tagName).toBe('BUTTON');
    expect(b.getAttribute('role')).toBe('checkbox');
    expect(b.getAttribute('aria-checked')).toBe('true');
    expect(b.getAttribute('aria-label')).toContain('Rinse');
  });
  it('select-mode box is a checkbox button and aria-checked follows toggleSelect', () => {
    try { toggleSelectMode(); } catch (e) { /* DOM re-render not needed here */ }
    const wrap = card();
    document.body.innerHTML = '';
    document.body.appendChild(wrap);
    const b = wrap.querySelector('.sel-box');
    expect(b.tagName).toBe('BUTTON');
    expect(b.getAttribute('role')).toBe('checkbox');
    expect(b.getAttribute('aria-checked')).toBe('false');
    toggleSelect('t1');
    expect(wrap.querySelector('.sel-box').getAttribute('aria-checked')).toBe('true');
  });
});

describe('dialog keyboard support (#36)', () => {
  let opener, modal, closed;
  beforeEach(() => {
    closed = 0;
    document.body.innerHTML =
      '<button id="opener">open</button>' +
      '<div id="m-modal" class="hidden" role="dialog" aria-modal="true"><div class="lb-card"><button id="first">x</button><button id="last">y</button></div></div>';
    opener = document.getElementById('opener');
    modal = document.getElementById('m-modal');
    modal.addEventListener('click', () => { closed++; modal.classList.add('hidden'); });
    initDialogA11y();
  });
  const tick = () => new Promise(r => setTimeout(r, 0));

  it('Esc closes the top visible dialog', async () => {
    modal.classList.remove('hidden');
    await tick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closed).toBe(1);
    expect(modal.classList.contains('hidden')).toBe(true);
  });
  it('Esc does nothing when no dialog is open', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closed).toBe(0);
  });
  it('focus moves into the dialog on open and returns to the opener on close', async () => {
    opener.focus();
    modal.classList.remove('hidden');
    await tick();
    expect(modal.contains(document.activeElement)).toBe(true);
    modal.classList.add('hidden');
    await tick();
    expect(document.activeElement).toBe(opener);
  });
  it('Tab on the last control wraps to the first (focus trap)', async () => {
    modal.classList.remove('hidden');
    await tick();
    document.getElementById('last').focus();
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement.id).toBe('first');
  });
});

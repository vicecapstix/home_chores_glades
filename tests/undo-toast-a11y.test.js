import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));

const read = f => readFileSync(resolve(__dirname, '../src', f), 'utf8');
const doc = new DOMParser().parseFromString(read('index.html'), 'text/html');
const css = read('style.css');

describe('undo toast markup', () => {
  const toast = doc.getElementById('undo-toast');
  it('is a polite live region', () => {
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.getAttribute('aria-live')).toBe('polite');
  });
  it('Undo is a real button with an accessible name', () => {
    const btn = toast.querySelector('button#undo-btn');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.getAttribute('aria-label')).toBeTruthy();
    expect(toast.querySelector('span[onclick]')).toBeNull();
  });
  it('has no inline pointer-events or positioning', () => {
    expect(toast.getAttribute('style')).toBeNull();
  });
});

describe('undo toast CSS', () => {
  it('hidden toast has no pointer events; only .show enables them', () => {
    expect(css).toMatch(/\.toast \{[^}]*pointer-events: none/);
    expect(css).toMatch(/#undo-toast\.show \{ pointer-events: auto; \}/);
    expect(css).not.toMatch(/#undo-toast \{[^}]*pointer-events: auto/);
  });
  it('toasts stack at <=480px', () => {
    const m = css.slice(css.indexOf('@media (max-width: 480px)'));
    expect(m).toContain('.toast { max-width:');
    expect(m).toMatch(/#undo-toast \{[^}]*bottom: calc\(/);
  });
});

describe('undo button accessible name', () => {
  let pushUndo;
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="undo-toast"><span id="undo-label"></span><button id="undo-btn"></button></div>';
    pushUndo = (await import('../src/undo.js')).pushUndo;
  });
  afterEach(() => vi.useRealTimers());

  it('names the deleted item', () => {
    pushUndo({ label: 'Clean Kitchen', undo: vi.fn() });
    expect(document.getElementById('undo-btn').getAttribute('aria-label')).toBe('Undo delete of Clean Kitchen');
  });
  it('uses a custom verb when given', () => {
    pushUndo({ label: 'Bob', verb: 'Removed', undo: vi.fn() });
    expect(document.getElementById('undo-btn').getAttribute('aria-label')).toBe('Undo removed Bob');
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = f => readFileSync(resolve(__dirname, '../src', f), 'utf8');
const doc = new DOMParser().parseFromString(read('index.html'), 'text/html');

const MODALS = ['summary', 'stats', 'leaderboard', 'templates', 'setpin', 'admin-panel', 'rewards'];

describe('a11y: modals', () => {
  it.each(MODALS)('%s modal is a labelled dialog', name => {
    const m = doc.getElementById(name + '-modal');
    expect(m.getAttribute('role')).toBe('dialog');
    expect(m.getAttribute('aria-modal')).toBe('true');
    const title = doc.getElementById(m.getAttribute('aria-labelledby'));
    expect(title).not.toBeNull();
    expect(m.contains(title)).toBe(true);
  });
  it('every close button has an aria-label', () => {
    const closes = [...doc.querySelectorAll('.lb-close')];
    expect(closes.length).toBe(8);
    closes.forEach(b => expect(b.getAttribute('aria-label')).toBe('Close'));
  });
  it('PIN pad delete keys are labelled', () => {
    const dels = [...doc.querySelectorAll('.pin-key.del')];
    expect(dels.length).toBe(2);
    dels.forEach(b => expect(b.getAttribute('aria-label')).toBe('Delete'));
  });
});

describe('a11y: header, forms, landmarks', () => {
  it('icon-only header buttons have aria-label', () => {
    const btns = [...doc.querySelectorAll('header .theme-toggle')];
    expect(btns.length).toBe(12);
    // 7 + reminders bell (#48) + activity (#49) + rewards (#51) + reorder (#55) + install (#178)
    btns.forEach(b => expect(b.getAttribute('aria-label')).toBeTruthy());
  });
  it.each(['new-member', 'new-task', 'new-freq', 'new-diff', 'new-cat', 'new-person', 'new-notes',
    'export-from', 'export-to', 'tpl-name-input'])('%s has an associated label', id => {
    expect(doc.querySelector('label[for="' + id + '"]')).not.toBeNull();
  });
  it('has a main landmark and a skip link to it', () => {
    const main = doc.querySelector('main#main-content');
    expect(main).not.toBeNull();
    expect(doc.querySelector('a.skip-link[href="#main-content"]')).not.toBeNull();
  });
  it('toast is a polite status region', () => {
    const t = doc.getElementById('toast');
    expect(t.getAttribute('role')).toBe('status');
    expect(t.getAttribute('aria-live')).toBe('polite');
  });
  // The built bundle has 28 'aria-' hits; 1 comes from the bundled Firebase SDK, so the shell has 27.
  it('src shell has at least the 27 aria-* attributes of the live build', () => {
    expect((read('index.html').match(/aria-/g) || []).length).toBeGreaterThanOrEqual(27);
  });
});

describe('a11y: css, render, keyboard', () => {
  const css = read('style.css');
  it('defines sr-only, skip-link and focus-visible', () => {
    expect(css).toMatch(/\.sr-only\s*\{/);
    expect(css).toMatch(/\.skip-link:focus/);
    expect(css).toMatch(/button:focus-visible/);
  });
  it('uses AA-contrast tokens and dark overrides', () => {
    expect(css).toMatch(/--muted:\s*#6A6860/i);
    expect(css).toMatch(/--warn:\s*#943A0B/i);
    expect(css).toMatch(/--soon:\s*#6B4800/i);
    expect(css).toMatch(/\[data-theme="dark"\][^}]*--warn:\s*#F4845F/s);
  });
  it('enlarges tap targets', () => {
    expect(css).toMatch(/min-width:\s*40px/);
    expect(css).toMatch(/\.subtask-del[^}]*min-width:\s*36px/);
  });
  it('section headings render as h2', () => {
    expect(read('render.js')).toMatch(/<h2 class="section-head"/);
  });
  it('PIN pads respond to digit and Backspace keys', () => {
    const js = read('main.js');
    expect(js).toMatch(/memberPinKey\(e\.key\)/);
    expect(js).toMatch(/setPinKey\(e\.key\)/);
    expect(js).toMatch(/Backspace/);
  });
});

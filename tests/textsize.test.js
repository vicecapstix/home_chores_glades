import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { nextTextSize, storedTextSize, urlTextSize, applyTextSize, cycleTextSize, initTextSize, getTextSize } from '../src/textsize.js';

const root = document.documentElement;
beforeEach(() => {
  localStorage.clear();
  root.className = '';
  document.body.innerHTML = '<button id="textsize-btn">A</button>';
  applyTextSize('normal');
});

describe('text size setting (#356)', () => {
  it('cycles Normal -> Large -> Extra large -> Normal', () => {
    expect(nextTextSize('normal')).toBe('large');
    expect(nextTextSize('large')).toBe('xl');
    expect(nextTextSize('xl')).toBe('normal');
  });

  it('defaults to Normal with no root class', () => {
    expect(initTextSize('')).toBe('normal');
    expect(root.classList.contains('ts-large')).toBe(false);
    expect(root.classList.contains('ts-xl')).toBe(false);
  });

  it('applies a root class and updates the button label', () => {
    applyTextSize('large');
    expect(root.classList.contains('ts-large')).toBe(true);
    expect(document.getElementById('textsize-btn').textContent).toBe('A+');
    expect(document.getElementById('textsize-btn').getAttribute('aria-label')).toContain('Large');
    applyTextSize('xl');
    expect(root.classList.contains('ts-large')).toBe(false);
    expect(root.classList.contains('ts-xl')).toBe(true);
    expect(document.getElementById('textsize-btn').textContent).toBe('A++');
  });

  it('saves per device and restores on the next start', () => {
    cycleTextSize();
    expect(localStorage.getItem('fc_textsize')).toBe('large');
    root.className = '';
    expect(initTextSize('')).toBe('large');
    expect(root.classList.contains('ts-large')).toBe(true);
  });

  it('ignores unknown stored values', () => {
    localStorage.setItem('fc_textsize', 'huge');
    expect(storedTextSize()).toBe('normal');
  });

  it('survives blocked storage (try/catch)', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(initTextSize('')).toBe('normal');
    expect(cycleTextSize()).toBe('large');
    expect(root.classList.contains('ts-large')).toBe(true);
    get.mockRestore(); set.mockRestore();
  });

  it('?readonly=1&text=large sets it on the TV without a tap, and is not stored', () => {
    expect(urlTextSize('?readonly=1&text=large')).toBe('large');
    expect(initTextSize('?readonly=1&text=large')).toBe('large');
    expect(root.classList.contains('ts-large')).toBe(true);
    expect(localStorage.getItem('fc_textsize')).toBeNull();
  });

  it('accepts xl spellings, rejects junk, and the URL beats a stored value', () => {
    for (const v of ['xl', 'XLarge', 'extra-large', 'extralarge']) expect(urlTextSize('?text=' + v)).toBe('xl');
    expect(urlTextSize('?text=giant')).toBeNull();
    expect(urlTextSize('')).toBeNull();
    localStorage.setItem('fc_textsize', 'xl');
    expect(initTextSize('?text=large')).toBe('large');
    expect(getTextSize()).toBe('large');
  });

  it('writes nothing to Firebase (no firebase import) and the CSS scales the root', () => {
    expect(readFileSync('src/textsize.js', 'utf8')).not.toMatch(/firebase|state\.js/);
    const css = readFileSync('src/style.css', 'utf8');
    expect(css).toMatch(/html\.ts-large \{ font-size: 115%; \}/);
    expect(css).toMatch(/html\.ts-xl \{ font-size: 130%; \}/);
    expect(css).toMatch(/body \{[^}]*font-size: 1rem;/);
    expect(readFileSync('src/index.html', 'utf8')).toContain('id="textsize-btn"');
  });
});

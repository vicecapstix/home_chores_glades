import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getThemeSetting, resolveTheme, nextThemeSetting, applyTheme, cycleTheme, initTheme } from '../src/theme.js';

let dark = false;
let listeners = [];
function mockMedia(initial) {
  dark = initial; listeners = [];
  window.matchMedia = vi.fn(q => ({
    matches: q.includes('dark') ? dark : false,
    addEventListener: (_t, fn) => listeners.push(fn),
  }));
}
const flip = v => { dark = v; listeners.forEach(fn => fn()); };
const attr = () => document.documentElement.getAttribute('data-theme');
const metaColor = () => document.querySelector('meta[name="theme-color"]').getAttribute('content');

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.head.innerHTML = '<meta name="theme-color" content="#2D6A4F">';
  document.body.innerHTML = '<button id="theme-btn"></button>';
  mockMedia(false);
});

describe('theme setting (#179)', () => {
  it('cycles Auto -> Light -> Dark -> Auto', () => {
    expect(nextThemeSetting('auto')).toBe('light');
    expect(nextThemeSetting('light')).toBe('dark');
    expect(nextThemeSetting('dark')).toBe('auto');
  });
  it('defaults to Auto and persists each step', () => {
    expect(getThemeSetting()).toBe('auto');
    expect(cycleTheme().setting).toBe('light');
    expect(localStorage.getItem('fc_theme')).toBe('light');
    expect(cycleTheme().setting).toBe('dark');
    expect(cycleTheme().setting).toBe('auto');
    expect(localStorage.getItem('fc_theme')).toBe('auto');
  });
  it('resolveTheme only follows the device in Auto', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  it('button label names the current setting and the next one', () => {
    applyTheme();
    expect(document.getElementById('theme-btn').getAttribute('aria-label')).toBe('Theme: Auto. Tap for Light');
  });
});

describe('Auto follows prefers-color-scheme live (#179)', () => {
  it('applies the device theme and reacts to changes', () => {
    initTheme();
    expect(attr()).toBeNull();
    flip(true);
    expect(attr()).toBe('dark');
    expect(metaColor()).toBe('#1A1A18');
    flip(false);
    expect(attr()).toBeNull();
    expect(metaColor()).toBe('#2D6A4F');
  });
  it('ignores device changes when Light or Dark is chosen', () => {
    localStorage.setItem('fc_theme', 'light');
    initTheme();
    flip(true);
    expect(attr()).toBeNull();
    localStorage.setItem('fc_theme', 'dark');
    flip(false);
    expect(attr()).toBeNull(); // not re-applied, but also not forced light
    applyTheme();
    expect(attr()).toBe('dark');
  });
});

describe('legacy saved values keep working (#179)', () => {
  it("'dark' stays dark and 'light' stays light even if the device disagrees", () => {
    mockMedia(false);
    localStorage.setItem('fc_theme', 'dark');
    applyTheme();
    expect(attr()).toBe('dark');
    expect(metaColor()).toBe('#1A1A18');
    mockMedia(true);
    localStorage.setItem('fc_theme', 'light');
    applyTheme();
    expect(attr()).toBeNull();
    expect(metaColor()).toBe('#2D6A4F');
  });
  it('garbage values are treated as Auto', () => {
    localStorage.setItem('fc_theme', 'purple');
    expect(getThemeSetting()).toBe('auto');
  });
});

describe('inline restore script in index.html (#179)', () => {
  const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const run = () => new Function(script)();
  it('is placed after the theme-color meta so it can update it', () => {
    expect(html.indexOf('name="theme-color"')).toBeLessThan(html.indexOf('<script>'));
  });
  it('Auto + dark device -> dark before first paint, meta updated', () => {
    mockMedia(true);
    run();
    expect(attr()).toBe('dark');
    expect(metaColor()).toBe('#1A1A18');
  });
  it('Auto + light device -> no attribute', () => {
    run();
    expect(attr()).toBeNull();
  });
  it('explicit light beats a dark device; explicit dark beats a light device', () => {
    mockMedia(true);
    localStorage.setItem('fc_theme', 'light');
    run();
    expect(attr()).toBeNull();
    mockMedia(false);
    localStorage.setItem('fc_theme', 'dark');
    run();
    expect(attr()).toBe('dark');
  });
  it('survives a missing matchMedia', () => {
    delete window.matchMedia;
    expect(() => run()).not.toThrow();
    expect(attr()).toBeNull();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), get READONLY() { return globalThis.__RO !== false; } }));
import { overflowPx, hiddenCount, stepScroll, tvScrollTick, resetTvScroll, HOLD_MS, SCROLL_PX_S, TOLERANCE_PX } from '../src/tvscroll.js';

const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
const main = readFileSync(resolve(__dirname, '../src/main.js'), 'utf8');

// jsdom has no layout: give the section its measured sizes by hand.
function mount({ scrollH = 800, clientH = 300, cards = [] } = {}) {
  document.body.innerHTML = '<div id="task-list"><div class="section" data-k="ok"><h2 class="section-head">Later</h2></div></div>';
  const sec = document.querySelector('.section');
  Object.defineProperty(sec, 'scrollHeight', { value: scrollH, configurable: true });
  Object.defineProperty(sec, 'clientHeight', { value: clientH, configurable: true });
  cards.forEach(([top, h]) => {
    const c = document.createElement('div'); c.className = 'task-card';
    Object.defineProperty(c, 'offsetTop', { value: top }); Object.defineProperty(c, 'offsetHeight', { value: h });
    sec.appendChild(c);
  });
  return sec;
}
beforeEach(() => { globalThis.__RO = true; resetTvScroll(); });

describe('overflow decision (#400)', () => {
  it('only a section taller than its slot (beyond a 4 px tolerance) overflows', () => {
    expect(overflowPx(300, 300)).toBe(0);
    expect(overflowPx(300 + TOLERANCE_PX, 300)).toBe(0);
    expect(overflowPx(305, 300)).toBe(5);
    expect(overflowPx(800, 300)).toBe(500);
  });
  it('counts cut-off cards', () => {
    expect(hiddenCount([100, 200, 300, 400, 500], 300)).toBe(2);
    expect(hiddenCount([100, 300 + TOLERANCE_PX], 300)).toBe(0);
    expect(hiddenCount([], 300)).toBe(0);
  });
});

describe('scroll cycle: top, down, bottom, back to top (#400)', () => {
  it('holds, scrolls to the bottom, holds, then returns to the top', () => {
    let s = { pos: 0, phase: 'top', wait: 0 };
    s = stepScroll(s, HOLD_MS - 100, 100); expect(s).toMatchObject({ phase: 'top', pos: 0 });
    s = stepScroll(s, 100, 100); expect(s.phase).toBe('down');
    s = stepScroll(s, 1000, 100); expect(s.pos).toBeCloseTo(SCROLL_PX_S);
    s = stepScroll(s, 60000, 100); expect(s).toMatchObject({ phase: 'bottom', pos: 100 });
    s = stepScroll(s, HOLD_MS, 100); expect(s).toMatchObject({ phase: 'top', pos: 0 });
  });
  it('nothing to scroll resets to rest', () => {
    expect(stepScroll({ pos: 50, phase: 'down', wait: 0 }, 100, 0)).toEqual({ pos: 0, phase: 'top', wait: 0 });
  });
});

describe('on the TV (READONLY)', () => {
  it('a section taller than its slot scrolls after the hold, a fitting one never moves', () => {
    const sec = mount();
    for (let i = 0; i < HOLD_MS / 100; i++) tvScrollTick(100);
    expect(sec.scrollTop).toBe(0);
    for (let i = 0; i < 50; i++) tvScrollTick(100); // 5 s of scrolling
    expect(sec.scrollTop).toBeGreaterThan(50);
    const fit = mount({ scrollH: 300, clientH: 300 });
    for (let i = 0; i < 200; i++) tvScrollTick(100);
    expect(fit.scrollTop).toBe(0);
  });
  it('reduced motion: no scrolling, header says how many are cut off', () => {
    const sec = mount({ cards: [[0, 100], [100, 100], [200, 100], [300, 100], [400, 100]] });
    for (let i = 0; i < 200; i++) tvScrollTick(100, { reduced: true });
    expect(sec.scrollTop).toBe(0);
    expect(sec.querySelector('.section-head').dataset.more).toBe('2');
    tvScrollTick(100, { reduced: true, root: document }); // idempotent
    expect(sec.querySelector('.section-head').dataset.more).toBe('2');
  });
  it('night mode holds the scroll at the top and resumes afterwards', () => {
    const sec = mount();
    for (let i = 0; i < 100; i++) tvScrollTick(100);
    expect(sec.scrollTop).toBeGreaterThan(0);
    tvScrollTick(100, { dim: true });
    expect(sec.scrollTop).toBe(0);
    for (let i = 0; i < 100; i++) tvScrollTick(100, { dim: true });
    expect(sec.scrollTop).toBe(0);
    for (let i = 0; i < 60; i++) tvScrollTick(100); // wake: hold, then move again
    expect(sec.scrollTop).toBeGreaterThan(0);
  });
  it('the "+N more" label clears once the section fits', () => {
    const sec = mount({ cards: [[0, 100], [400, 100]] });
    tvScrollTick(100, { reduced: true });
    expect(sec.querySelector('.section-head').dataset.more).toBe('1');
    Object.defineProperty(sec, 'scrollHeight', { value: 300, configurable: true });
    tvScrollTick(100, { reduced: true });
    expect(sec.querySelector('.section-head').dataset.more).toBeUndefined();
  });
});

describe('no effect outside the TV view (#400)', () => {
  it('does nothing when not READONLY', () => {
    globalThis.__RO = false;
    const sec = mount({ cards: [[0, 100], [500, 100]] });
    for (let i = 0; i < 200; i++) tvScrollTick(100, { readonly: false });
    expect(sec.scrollTop).toBe(0);
    expect(sec.querySelector('.section-head').dataset.more).toBeUndefined();
  });
  it('the section cap only exists under body.tv, and main starts the module', () => {
    expect(css).toMatch(/body\.tv #task-list > \.section \{ position: relative; max-height: 62vh; overflow: hidden;/); // relative: card.offsetTop is measured from the section
    expect(css).not.toMatch(/^\.section \{[^}]*overflow: hidden/m);
    expect(main).toContain("initTvScroll()");
  });
});

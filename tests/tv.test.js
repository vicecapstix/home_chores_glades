import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { state } from '../src/state.js';
import { applyTvMode, formatClock, updateClock, tvStripHTML, requestWakeLock } from '../src/tv.js';

const src = f => readFileSync(resolve(__dirname, '../src', f), 'utf8');

beforeEach(() => {
  document.body.className = '';
  document.body.innerHTML = '<div id="tv-clock"></div><div id="tv-strip"></div>';
  state.members = {
    Ann: { name: 'Ann', weekPoints: 5, streak: 0 },
    Bo: { name: 'Bo', weekPoints: 12, streak: 3 },
    '<b>X</b>': { name: '<b>X</b>', weekPoints: 1 },
  };
});

describe('tv class toggle', () => {
  it('adds body.tv when readonly and removes it otherwise', () => {
    expect(applyTvMode(true)).toBe(true);
    expect(document.body.classList.contains('tv')).toBe(true);
    expect(applyTvMode(false)).toBe(false);
    expect(document.body.classList.contains('tv')).toBe(false);
  });
});

describe('clock', () => {
  it('formats time and date strings', () => {
    const { time, date } = formatClock(new Date(2026, 9, 14, 19, 5));
    expect(time).toMatch(/7|19/);
    expect(date).toMatch(/14/);
  });
  it('renders into #tv-clock and tolerates it missing', () => {
    updateClock(new Date(2026, 9, 14, 8, 30));
    expect(document.querySelector('#tv-clock .tv-time')).not.toBeNull();
    expect(document.querySelector('#tv-clock .tv-date')).not.toBeNull();
    document.body.innerHTML = '';
    expect(() => updateClock()).not.toThrow();
  });
});

describe('leaderboard strip', () => {
  it('sorts by weekly points and shows streaks', () => {
    const html = tvStripHTML();
    expect(html.indexOf('Bo')).toBeLessThan(html.indexOf('Ann'));
    expect(html).toContain('🔥3');
  });
  it('escapes member names', () => {
    const html = tvStripHTML();
    expect(html).not.toContain('<b>X</b>');
    expect(html).toContain('&lt;b&gt;X');
  });
  it('is empty with no members', () => {
    expect(tvStripHTML({})).toBe('');
  });
});

describe('wake lock is guarded', () => {
  it('returns null when unsupported', async () => {
    expect(await requestWakeLock({})).toBeNull();
    expect(await requestWakeLock(undefined)).toBeNull();
  });
  it('returns the sentinel when supported', async () => {
    const sentinel = { release: vi.fn() };
    const nav = { wakeLock: { request: vi.fn().mockResolvedValue(sentinel) } };
    expect(await requestWakeLock(nav)).toBe(sentinel);
    expect(nav.wakeLock.request).toHaveBeenCalledWith('screen');
  });
  it('swallows rejection (e.g. low battery / denied)', async () => {
    const nav = { wakeLock: { request: vi.fn().mockRejectedValue(new Error('NotAllowedError')) } };
    expect(await requestWakeLock(nav)).toBeNull();
  });
});

describe('layout wiring', () => {
  const css = src('style.css');
  it('has a >=1200px readonly 3-column grid', () => {
    expect(css).toMatch(/@media \(min-width: 1200px\)[\s\S]*body\[data-readonly\] #task-list \{[^}]*grid-template-columns: repeat\(3, 1fr\)/);
  });
  it('places overdue / soon / done in columns 1-3', () => {
    ['overdue:1', 'soon:2', 'done:3'].forEach(p => {
      const [k, n] = p.split(':');
      expect(css).toContain('.section[data-k="' + k + '"] { grid-column: ' + n + '; grid-row: 1; }');
    });
  });
  it('hides admin controls and un-fixes the banner in readonly', () => {
    expect(css).toMatch(/body\[data-readonly\] #readonly-banner \{ position: static; \}/);
    expect(css).toMatch(/body\[data-readonly\] \.add-bar[\s\S]*?display: none !important/);
  });
  it('render emits data-k on sections and refreshes the strip', () => {
    const r = src('render.js');
    expect(r).toContain('data-k="');
    expect(r).toContain('renderTvStrip()');
  });
  it('markup has clock and strip containers', () => {
    const html = src('index.html');
    expect(html).toContain('id="tv-clock"');
    expect(html).toContain('id="tv-strip"');
  });
});

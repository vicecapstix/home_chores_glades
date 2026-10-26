import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { state } from '../src/state.js';
import { getWeekStart, localDateStr } from '../src/utils.js';
import { applyTvMode, formatClock, updateClock, tvStripHTML, requestWakeLock, createTvCycle, initTvCycle } from '../src/tv.js';

const src = f => readFileSync(resolve(__dirname, '../src', f), 'utf8');

beforeEach(() => {
  document.body.className = '';
  document.body.innerHTML = '<div id="tv-clock"></div><div id="tv-strip"></div>';
  const weekStart = getWeekStart();
  state.members = {
    Ann: { name: 'Ann', weekPoints: 5, weekStart, streak: 0 },
    Bo: { name: 'Bo', weekPoints: 12, weekStart, streak: 3, lastStreakDate: localDateStr() },
    '<b>X</b>': { name: '<b>X</b>', weekPoints: 1, weekStart },
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
  it('has a >=1200px body.tv 3-column grid', () => {
    expect(css).toMatch(/@media \(min-width: 1200px\)[\s\S]*body\.tv #task-list \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
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

describe('TV auto-cycle (#148)', () => {
  let cycle, panelHTML;
  const key = k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
  const panel = () => document.getElementById('tv-panel');
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<section id="tv-panel" class="hidden"></section><main id="main-content"></main>';
    panelHTML = vi.fn(n => '<p>' + n + ' <b>x</b></p>');
    cycle = createTvCycle({ panelHTML });
    cycle.start();
  });
  afterEach(() => { cycle.stop(); vi.useRealTimers(); });

  it('starts on chores and rotates every 30 s: chores -> leaderboard -> rewards -> chores', () => {
    expect(cycle.current()).toBe('chores');
    expect(panel().classList.contains('hidden')).toBe(true);
    vi.advanceTimersByTime(30000);
    expect(cycle.current()).toBe('leaderboard');
    expect(panel().classList.contains('hidden')).toBe(false);
    expect(document.body.classList.contains('tv-panel-on')).toBe(true);
    expect(panel().innerHTML).toContain('leaderboard');
    vi.advanceTimersByTime(30000);
    expect(cycle.current()).toBe('rewards');
    vi.advanceTimersByTime(30000);
    expect(cycle.current()).toBe('chores');
    expect(document.body.classList.contains('tv-panel-on')).toBe(false);
  });
  it('arrow keys move between panels (wrapping) and pause cycling for 2 minutes', () => {
    key('ArrowRight');
    expect(cycle.current()).toBe('leaderboard');
    key('ArrowLeft'); key('ArrowLeft');
    expect(cycle.current()).toBe('rewards');
    vi.advanceTimersByTime(90000); // ticks at 30/60/90 s are skipped
    expect(cycle.current()).toBe('rewards');
    vi.advanceTimersByTime(30000); // 120 s after the key: resumes
    expect(cycle.current()).toBe('chores');
  });
  it('any other key pauses without moving', () => {
    key('x');
    vi.advanceTimersByTime(119000);
    expect(cycle.current()).toBe('chores');
    vi.advanceTimersByTime(1000);
    expect(cycle.current()).toBe('leaderboard');
  });
  it('escapes the title and refresh re-renders the current panel', () => {
    key('ArrowRight');
    panelHTML.mockClear();
    cycle.refresh();
    expect(panelHTML).toHaveBeenCalledWith('leaderboard');
    expect(panel().querySelector('.tv-panel-title').textContent).toContain('Leaderboard');
  });
  it('is display only: markup, no Firebase imports, no animation under reduced motion', () => {
    const t = src('tv.js');
    expect(t).not.toMatch(/from '\.\/firebase\.js'/);
    expect(t).toContain('if (!READONLY || !TV_CYCLE) return null');
    expect(src('index.html')).toContain('id="tv-panel"');
    expect(src('style.css')).toMatch(/prefers-reduced-motion: reduce\) \{ #tv-panel\.tv-slide \{ animation: none; \} \}/);
  });
});

describe('TV auto-cycle gating', () => {
  it('initTvCycle does nothing unless readonly + cycle=1 (this suite has neither)', () => {
    expect(initTvCycle(() => '')).toBeNull();
  });
});

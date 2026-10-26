import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../src/firebase.js', () => ({
  initFirebase: vi.fn(), getDb: vi.fn(), initAuth: vi.fn(), writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(),
  patchRoot: vi.fn(), patchPaths: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(), onValue: vi.fn(), ref: vi.fn(),
}));

import { state } from '../src/state.js';
import { render, initRender } from '../src/render.js';
import { adjacentCheck, initCardArrowNav } from '../src/a11y.js';
import { toastDuration, showToast, setLbTab, setStatsTab } from '../src/ui.js';
import { renderHistory } from '../src/history.js';

const read = f => readFileSync(resolve(__dirname, '../src', f), 'utf8');
const css = read('style.css');

// ── contrast helpers (WCAG 2.x) ──
const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const tokens = block => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map(m => [m[1], m[2]]));
const light = tokens(css.match(/:root\s*\{([^}]*)\}/)[1]);
const dark = { ...light, ...tokens(css.match(/\[data-theme="dark"\]\s*\{([^}]*)\}/)[1]) };
const tagPairs = css.match(/\.tag-[\w-]+\s*\{[^}]*\}/g).map(r => ({
  cls: r.match(/\.tag-[\w-]+/)[0],
  fg: (r.match(/(?:^|[;{\s])color:\s*var\(--([\w-]+)\)/) || [])[1],
  bg: (r.match(/background:\s*var\(--([\w-]+)\)/) || [])[1],
})).filter(p => p.fg && p.bg);

describe('tag contrast >= 4.5:1 in both themes (#36)', () => {
  it('finds the tag token pairs', () => { expect(tagPairs.length).toBeGreaterThanOrEqual(6); });
  for (const [name, t] of [['light', light], ['dark', dark]]) {
    it('every tag pair passes in ' + name, () => {
      tagPairs.forEach(p => expect(ratio(t[p.fg], t[p.bg]), name + ' ' + p.cls).toBeGreaterThanOrEqual(4.5));
    });
  }
});

describe('tap targets >= 44px at <=480px (#36)', () => {
  const mobile = css.slice(css.indexOf('@media (max-width: 480px)'));
  const block = mobile.slice(0, mobile.indexOf('\n}'));
  it('subtask delete, move buttons and header icons are 44x44', () => {
    const m = block.match(/([^{}]*\.subtask-del[^{}]*\.move-btn[^{}]*\.theme-toggle[^{}]*)\{([^}]*)\}/);
    expect(m).toBeTruthy();
    expect(m[2]).toMatch(/min-width:\s*44px/);
    expect(m[2]).toMatch(/min-height:\s*44px/);
  });
});

describe('status toast duration (#36)', () => {
  it('is at least 5 s, ~60 ms/char, capped at 10 s', () => {
    expect(toastDuration('Saved')).toBe(5000);
    expect(toastDuration('x'.repeat(100))).toBe(6000);
    expect(toastDuration('x'.repeat(1000))).toBe(10000);
    expect(toastDuration('')).toBe(5000);
  });
  it('showToast hides after that long, not 1.8 s', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="toast"></div>';
    showToast('hi');
    vi.advanceTimersByTime(4999);
    expect(document.getElementById('toast').classList.contains('show')).toBe(true);
    vi.advanceTimersByTime(2);
    expect(document.getElementById('toast').classList.contains('show')).toBe(false);
    vi.useRealTimers();
  });
});

describe('arrow keys move between cards (#36)', () => {
  it('adjacentCheck picks neighbours and stops at the ends', () => {
    const a = {}, b = {}, c = {};
    expect(adjacentCheck([a, b, c], b, 1)).toBe(c);
    expect(adjacentCheck([a, b, c], b, -1)).toBe(a);
    expect(adjacentCheck([a, b, c], c, 1)).toBeNull();
    expect(adjacentCheck([a, b, c], {}, 1)).toBeNull();
  });
  it('ArrowDown/ArrowUp on a check button move focus', () => {
    initCardArrowNav();
    document.body.innerHTML = '<div id="task-list">' + ['a', 'b', 'c'].map(i =>
      '<div class="task-card" data-id="' + i + '"><button class="check" id="c' + i + '"></button></div>').join('') + '</div>';
    const first = document.getElementById('ca');
    first.focus();
    const ev = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    first.dispatchEvent(ev);
    expect(document.activeElement.id).toBe('cb');
    expect(ev.defaultPrevented).toBe(true);
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(document.activeElement.id).toBe('ca');
  });
});

describe('focus survives a re-render (#36)', () => {
  beforeEach(() => {
    document.body.innerHTML = ['h-total', 'h-done', 'h-overdue', 'h-pct'].map(i => '<span id="' + i + '"></span>').join('') +
      '<div id="prog"></div><div id="member-chips"></div><select id="new-person"></select><div id="filters"></div><div id="task-list"></div>';
    state.members = { Ann: { name: 'Ann', role: 'admin' } };
    state.tasks = {
      t1: { id: 't1', name: 'One', freq: 'daily', person: 'Ann', done: false, lastDone: Date.now() },
      t2: { id: 't2', name: 'Two', freq: 'daily', person: 'Ann', done: false, lastDone: Date.now() },
    };
    initRender(() => true, () => 'Ann');
  });
  it('keeps focus on the same task\'s check button by id', () => {
    render();
    document.querySelector('#tc-t2 .check').focus();
    const old = document.activeElement;
    render();
    expect(document.activeElement).not.toBe(old);
    expect(document.activeElement.closest('.task-card').dataset.id).toBe('t2');
    expect(document.activeElement.classList.contains('check')).toBe(true);
  });
  it('keeps the right move button (up vs down)', () => {
    render();
    document.querySelectorAll('#tc-t1 .move-btn')[1].focus();
    render();
    expect(document.activeElement.getAttribute('aria-label')).toContain('down');
  });
});

describe('tab pills expose state (#36)', () => {
  it('static leaderboard/stats tabs start with aria-pressed', () => {
    const html = read('index.html');
    const tabs = [...html.matchAll(/<button class="lb-tab[^>]*>/g)].map(m => m[0]);
    expect(tabs.length).toBe(6);
    tabs.forEach(t => expect(t).toMatch(/aria-pressed="(true|false)"/));
  });
  it('setLbTab / setStatsTab move aria-pressed', () => {
    document.body.innerHTML = '<div id="leaderboard-modal"><button class="lb-tab active" aria-pressed="true" id="x"></button><button class="lb-tab" aria-pressed="false" id="y"></button></div>' +
      '<div id="stats-modal"><button class="lb-tab active" aria-pressed="true" id="p"></button><button class="lb-tab" aria-pressed="false" id="q"></button></div><div id="lb-list"></div><div id="stats-chart"></div>';
    state.members = {};
    try { setLbTab('week', document.getElementById('y')); } catch (e) { /* body render needs more DOM */ }
    try { setStatsTab('month', document.getElementById('q')); } catch (e) { /* ditto */ }
    expect(document.getElementById('x').getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('y').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('q').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('p').getAttribute('aria-pressed')).toBe('false');
  });
  it('history pills carry aria-pressed', () => {
    document.body.innerHTML = '<div id="history-filters"></div><div id="history-list"></div>';
    state.members = { Ann: { name: 'Ann' } }; state.history = [];
    renderHistory();
    const pills = [...document.querySelectorAll('#history-filters button')];
    expect(pills.map(p => p.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
  });
});

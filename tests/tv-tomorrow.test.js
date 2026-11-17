import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { state } from '../src/state.js';
import { setPauseUntil } from '../src/utils.js';
import { tvTomorrowHTML, tomorrowDay, renderTvTomorrow } from '../src/tv.js';

// Wed 14 Oct 2026; tomorrow is Thu 15 Oct.
const at = (h, m = 0, day = 14) => new Date(2026, 9, day, h, m, 0).getTime();
const base = { done: false, lastDone: new Date(2026, 9, 13, 12).getTime(), subtasks: {} };

beforeEach(() => {
  setPauseUntil('');
  state.members = { Ann: { name: 'Ann', role: 'member', colorIdx: 1, avatar: '🦊' }, Bo: { name: 'Bo', role: 'member' } };
  state.tasks = {
    d: { ...base, id: 'd', name: 'Pack PE kit', freq: 'daily', person: 'Ann', dueTime: '07:30', icon: '📚' },
    w: { ...base, id: 'w', name: 'Bins', freq: 'weekdays', days: [4], person: '' },
    x: { ...base, id: 'x', name: 'Mow lawn', freq: 'weekdays', days: [3], person: 'Bo' }, // Wed only
  };
});
afterEach(() => { vi.restoreAllMocks(); setPauseUntil(''); });

describe('TV Tomorrow panel (#355)', () => {
  it('is empty before 18:00 and shown from 18:00', () => {
    expect(tvTomorrowHTML(state.tasks, at(17, 59))).toBe('');
    expect(tvTomorrowHTML(state.tasks, at(18, 0))).toContain('Tomorrow, Thu');
  });

  it("lists tomorrow's chores only, with time, icon, person colour and avatar", () => {
    const html = tvTomorrowHTML(state.tasks, at(19));
    expect(html).toContain('Pack PE kit');
    expect(html).toContain('<b>07:30</b>');
    expect(html).toContain('📚');
    expect(html).toContain('🦊 Ann');
    expect(html).toContain('Bins');
    expect(html).toContain('Anyone');
    expect(html).not.toContain('Mow lawn');
  });

  it('on Sunday evening looks at next Monday', () => {
    state.tasks.m = { ...base, id: 'm', name: 'Monday chore', freq: 'weekdays', days: [1], person: 'Bo' };
    const sun = at(19, 0, 18);
    expect(tomorrowDay(state.tasks, sun).date).toBe('2026-10-19');
    expect(tvTomorrowHTML(state.tasks, sun)).toContain('Monday chore');
  });

  it('shows Paused under a house pause that covers tomorrow', () => {
    setPauseUntil('2026-10-16');
    const html = tvTomorrowHTML(state.tasks, at(19));
    expect(html).toContain('Paused');
    expect(html).not.toContain('Pack PE kit');
  });

  it('skips chores switched off past tomorrow, shows them again once back on', () => {
    state.tasks.d.offUntil = '2026-10-15';
    expect(tvTomorrowHTML(state.tasks, at(19))).not.toContain('Pack PE kit');
    state.tasks.d.offUntil = '2026-10-14';
    expect(tvTomorrowHTML(state.tasks, at(19))).toContain('Pack PE kit');
  });

  it('says Nothing due for an empty day and escapes user text', () => {
    state.tasks = {};
    expect(tvTomorrowHTML(state.tasks, at(19))).toContain('Nothing due');
    state.tasks = { e: { ...base, id: 'e', name: '<img src=x onerror=1>', freq: 'daily', person: '' } };
    const html = tvTomorrowHTML(state.tasks, at(19));
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('caps the list so the board never needs to scroll', () => {
    state.tasks = {};
    for (let i = 0; i < 20; i++) state.tasks['t' + i] = { ...base, id: 't' + i, name: 'Chore ' + String(i).padStart(2, '0'), freq: 'daily', person: '' };
    const html = tvTomorrowHTML(state.tasks, at(19));
    expect((html.match(/tv-tom-item/g) || []).length).toBe(12);
    expect(html).toContain('+8 more');
  });

  it('fits the TV layout: panel hidden by default, wired in the header, shown only in body.tv', () => {
    const css = readFileSync('src/style.css', 'utf8'), html = readFileSync('src/index.html', 'utf8');
    expect(css).toMatch(/#tv-clock, #tv-strip, #tv-tomorrow \{ display: none; \}/);
    expect(css).toMatch(/body\.tv #tv-tomorrow:not\(:empty\) \{ display: block/);
    expect(html).toContain('id="tv-tomorrow"');
  });

  it('renders nothing into the page when not READONLY (phone/tablet)', () => {
    document.body.innerHTML = '<div id="tv-tomorrow"></div>';
    renderTvTomorrow(at(19));
    expect(document.getElementById('tv-tomorrow').innerHTML).toBe('');
  });
});

describe('Tomorrow panel: overdue chores', () => {
  it('a chore overdue tonight is still due tomorrow', () => {
    state.tasks = { o: { ...base, id: 'o', name: 'Overdue weekly', freq: 'weekly', person: 'Bo', lastDone: new Date(2026, 8, 1).getTime() } };
    expect(tvTomorrowHTML(state.tasks, at(19))).toContain('Overdue weekly');
  });
});

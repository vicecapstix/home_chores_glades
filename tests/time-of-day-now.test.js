import { describe, it, expect, vi, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { currentSlot, todRank, inNowSlot } from '../src/utils.js';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { initRender, render, setFilter } from '../src/render.js';

const at = (h, m = 0) => new Date(2026, 9, 14, h, m).getTime();
afterEach(() => { vi.useRealTimers(); });

describe('time-of-day slots (#298)', () => {
  it('currentSlot: Morning before 12:00, After school 12:00-16:59, Evening from 17:00', () => {
    expect(currentSlot(at(7))).toBe('morning');
    expect(currentSlot(at(11, 59))).toBe('morning');
    expect(currentSlot(at(12))).toBe('afternoon');
    expect(currentSlot(at(15))).toBe('afternoon');
    expect(currentSlot(at(16, 59))).toBe('afternoon');
    expect(currentSlot(at(17))).toBe('evening');
    expect(currentSlot(at(20))).toBe('evening');
    expect(currentSlot(at(0))).toBe('morning');
  });

  it('inNowSlot keeps the current slot plus chores with no (or an invalid) time of day', () => {
    const m = { timeOfDay: 'morning' }, a = { timeOfDay: 'afternoon' }, e = { timeOfDay: 'evening' };
    expect(['m', m, a, e, {}, { timeOfDay: 'bogus' }].slice(1).map(t => inNowSlot(t, at(7)))).toEqual([true, false, false, true, true]);
    expect([m, a, e, {}].map(t => inNowSlot(t, at(15)))).toEqual([false, true, false, true]);
    expect([m, a, e, {}].map(t => inNowSlot(t, at(20)))).toEqual([false, false, true, true]);
  });

  it('todRank orders Morning, After school, Evening, then none', () => {
    const list = [{ n: 'none' }, { n: 'eve', timeOfDay: 'evening' }, { n: 'mor', timeOfDay: 'morning' }, { n: 'aft', timeOfDay: 'afternoon' }];
    expect(list.sort((x, y) => todRank(x) - todRank(y)).map(t => t.n)).toEqual(['mor', 'aft', 'eve', 'none']);
  });
});

describe('TV (READONLY) render of groups and the Now chip (#298)', () => {
  function setup(hour) {
    vi.useFakeTimers(); vi.setSystemTime(at(hour));
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    initRender(() => false, () => '');
    state.members = { Al: { name: 'Al', role: 'admin' } };
    const mk = (id, name, order, timeOfDay) => ({ id, name, freq: 'daily', done: false, person: '', order, difficulty: 'easy', ...(timeOfDay ? { timeOfDay } : {}) });
    state.tasks = {
      a: mk('a', 'NoTime', 1), b: mk('b', 'EveningJob', 2, 'evening'), c: mk('c', 'MorningJob', 3, 'morning'), d: mk('d', 'AfterJob', 4, 'afternoon'),
    };
    document.body.innerHTML = '<div id="filters"></div><div id="task-list"></div><div id="member-chips"></div><select id="new-person"></select>' +
      '<i id="h-total"></i><i id="h-done"></i><i id="h-overdue"></i><i id="h-pct"></i><div id="prog"></div><div id="double-banner" class="hidden"></div>';
    render();
  }
  const names = () => [...document.querySelectorAll('#task-list .task-name, #task-list .tname')].map(e => e.textContent.trim());
  const order = () => { const t = document.getElementById('task-list').textContent; return ['MorningJob', 'AfterJob', 'EveningJob', 'NoTime'].sort((x, y) => t.indexOf(x) - t.indexOf(y)); };

  it('orders chores Morning, After school, Evening, then no time of day', () => {
    setup(7); setFilter('all');
    expect(order()).toEqual(['MorningJob', 'AfterJob', 'EveningJob', 'NoTime']);
  });

  it('shows a Now chip with a count, and filtering at 07:00 keeps morning + no-time chores', () => {
    setup(7); setFilter('all');
    const chip = [...document.querySelectorAll('#filters .filter-pill')].find(b => b.textContent.startsWith('Now'));
    expect(chip).toBeTruthy();
    expect(chip.querySelector('.count').textContent).toBe('2');
    setFilter('now');
    const t = document.getElementById('task-list').textContent;
    expect(t).toContain('MorningJob'); expect(t).toContain('NoTime');
    expect(t).not.toContain('EveningJob'); expect(t).not.toContain('AfterJob');
  });

  it('at 15:00 and 20:00 the Now filter switches slot', () => {
    setup(15); setFilter('now');
    expect(document.getElementById('task-list').textContent).toContain('AfterJob');
    expect(document.getElementById('task-list').textContent).not.toContain('MorningJob');
    setup(20); setFilter('now');
    expect(document.getElementById('task-list').textContent).toContain('EveningJob');
    expect(document.getElementById('task-list').textContent).not.toContain('AfterJob');
  });

  it('the Now chip is display only: it calls setFilter and nothing is written', async () => {
    const fb = await import('../src/firebase.js');
    setup(7); setFilter('all');
    const chip = [...document.querySelectorAll('#filters .filter-pill')].find(b => b.textContent.startsWith('Now'));
    expect(chip.getAttribute('onclick')).toBe("window.setFilter('now')");
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    setFilter('now');
    expect(document.querySelector('#filters .filter-pill.active').textContent).toContain('Now');
    for (const f of Object.values(fb)) expect(f).not.toHaveBeenCalled();
  });
});

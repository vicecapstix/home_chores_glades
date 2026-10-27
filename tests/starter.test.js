import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { CATEGORIES } from '../src/config.js';

let admin = true;
vi.mock('../src/firebase.js', () => ({ patchPaths: vi.fn().mockResolvedValue(undefined) }));
import { patchPaths } from '../src/firebase.js';
import { STARTER, openStarter, toggleStarterCat, addStarterChores, addSelectedStarter } from '../src/starter.js';
import { taskPoints } from '../src/utils.js';

const isAdmin = () => admin;
beforeEach(() => {
  vi.clearAllMocks(); admin = true;
  state.tasks = {}; state.nextId = 5;
  document.body.innerHTML = '<div id="starter-modal" class="hidden"><div id="starter-list"></div></div><div id="toast"></div>';
});

describe('starter list', () => {
  it('has ~30 valid, unique entries', () => {
    expect(STARTER.length).toBeGreaterThanOrEqual(25);
    const names = STARTER.map(s => s.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const s of STARTER) {
      expect(['daily', 'weekly', 'weekdays', 'fortnightly', 'monthly', 'once']).toContain(s.freq);
      expect(['easy', 'medium', 'hard']).toContain(s.difficulty);
      expect(CATEGORIES).toContain(s.category);
      expect(taskPoints(s)).toBeGreaterThan(0);
    }
  });
});

describe('addStarterChores', () => {
  it('sends one patchPaths with the chosen tasks and nextId', async () => {
    const n = await addStarterChores([STARTER[0].name, STARTER[1].name], isAdmin);
    expect(n).toBe(2);
    expect(patchPaths).toHaveBeenCalledTimes(1);
    const p = patchPaths.mock.calls[0][0];
    const ids = Object.keys(p).filter(k => k.startsWith('tasks/'));
    expect(ids).toHaveLength(2);
    expect(p.nextId).toBe(7);
    const t = p[ids[0]];
    expect(t).toMatchObject({ person: '', done: false, name: STARTER[0].name, freq: STARTER[0].freq });
    expect(t.lastDone).toBeLessThanOrEqual(Date.now());
  });
  it('skips chores that already exist (case-insensitive)', async () => {
    state.tasks = { t1: { id: 't1', name: STARTER[0].name.toUpperCase() } };
    const n = await addStarterChores([STARTER[0].name, STARTER[1].name], isAdmin);
    expect(n).toBe(1);
    expect(Object.keys(patchPaths.mock.calls[0][0]).filter(k => k.startsWith('tasks/'))).toHaveLength(1);
  });
  it('writes nothing when nothing is selected', async () => {
    expect(await addStarterChores([], isAdmin)).toBe(0);
    expect(patchPaths).not.toHaveBeenCalled();
  });
  it('is refused for non-admins', async () => {
    admin = false;
    expect(await addStarterChores([STARTER[0].name], isAdmin)).toBe(0);
    expect(patchPaths).not.toHaveBeenCalled();
  });
});

describe('modal', () => {
  it('opens for admin, shows existing chores ticked and disabled', () => {
    state.tasks = { t1: { id: 't1', name: STARTER[0].name } };
    openStarter(isAdmin);
    expect(document.getElementById('starter-modal').classList.contains('hidden')).toBe(false);
    const dis = document.querySelectorAll('#starter-list input:disabled');
    expect(dis).toHaveLength(1);
    expect(dis[0].checked).toBe(true);
    expect(document.getElementById('starter-list').textContent).toContain('already added');
  });
  it('does not open for non-admins', () => {
    admin = false; openStarter(isAdmin);
    expect(document.getElementById('starter-modal').classList.contains('hidden')).toBe(true);
  });
  it('Select all ticks a category and Add selected sends them', async () => {
    openStarter(isAdmin);
    toggleStarterCat('Kitchen');
    const want = STARTER.filter(s => s.category === 'Kitchen').length;
    expect(document.querySelectorAll('#starter-list input:checked')).toHaveLength(want);
    expect(await addSelectedStarter(isAdmin)).toBe(want);
  });
  it('escapes names', () => {
    STARTER.push({ name: '<img src=x>', freq: 'daily', difficulty: 'easy', category: 'Other' });
    openStarter(isAdmin);
    STARTER.pop();
    expect(document.querySelector('#starter-list img')).toBeNull();
  });
});

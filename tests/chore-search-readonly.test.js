import { describe, it, expect, vi } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { initRender, setSearch } from '../src/render.js';

describe('chore search is ignored on the readonly TV (#354)', () => {
  it('a stray query never filters the TV list', () => {
    initRender(() => false, () => '');
    state.members = { Al: { name: 'Al', role: 'admin' } };
    state.tasks = { a: { id: 'a', name: 'Dishes', freq: 'daily', done: false, lastDone: 0, person: 'Al', order: 1, difficulty: 'easy' } };
    document.body.innerHTML = '<div id="filters"></div><div id="task-list"></div>';
    setSearch('zzz');
    expect(document.querySelectorAll('#task-list .task-card')).toHaveLength(1);
    expect(document.querySelector('#task-list .empty')).toBeNull();
  });
});

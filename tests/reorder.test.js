import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { moveOrders, moveTask } from '../src/tasks.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined),
  patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { writeState, patchRoot } from '../src/firebase.js';
import { showToast } from '../src/ui.js';

const admin = () => true, notAdmin = () => false;
const T = (o) => Object.fromEntries(Object.entries(o).map(([id, order]) => [id, { id, name: id, order }]));

describe('moveOrders (pure)', () => {
  it('moves down with insert semantics, changing only affected tasks', () => {
    const tasks = T({ a: 10, b: 20, c: 30 });
    expect(moveOrders(['a', 'b', 'c'], tasks, 'a', 1)).toEqual({ a: 20, b: 10 });
    expect(moveOrders(['a', 'b', 'c'], tasks, 'a', 1)).not.toHaveProperty('c');
  });
  it('moves up', () => {
    const tasks = T({ a: 10, b: 20, c: 30 });
    expect(moveOrders(['a', 'b', 'c'], tasks, 'c', -1)).toEqual({ b: 30, c: 20 });
  });
  it('is a no-op at the ends and for unknown ids', () => {
    const tasks = T({ a: 10, b: 20 });
    expect(moveOrders(['a', 'b'], tasks, 'a', -1)).toEqual({});
    expect(moveOrders(['a', 'b'], tasks, 'b', 1)).toEqual({});
    expect(moveOrders(['a', 'b'], tasks, 'zz', 1)).toEqual({});
  });
  it('renumbers duplicate/zero orders so a move still takes effect', () => {
    const tasks = T({ a: 0, b: 0, c: 0 });
    const out = moveOrders(['a', 'b', 'c'], tasks, 'a', 1);
    const next = { ...Object.fromEntries(Object.keys(tasks).map(k => [k, tasks[k].order])), ...out };
    expect(['a', 'b', 'c'].sort((x, y) => next[x] - next[y])).toEqual(['b', 'a', 'c']);
  });
  it('moves a task over a 3-step sequence with insert semantics', () => {
    const tasks = T({ a: 1, b: 2, c: 3, d: 4 });
    const apply = (ids, id, dir) => { Object.entries(moveOrders(ids, tasks, id, dir)).forEach(([k, v]) => { tasks[k].order = v; }); return ids.slice().sort((x, y) => tasks[x].order - tasks[y].order); };
    let ids = ['a', 'b', 'c', 'd'];
    ids = apply(ids, 'a', 1); ids = apply(ids, 'a', 1); ids = apply(ids, 'a', 1);
    expect(ids).toEqual(['b', 'c', 'd', 'a']);
  });
});

describe('moveTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.tasks = { t1: { id: 't1', name: 'A', order: 1 }, t2: { id: 't2', name: 'B', order: 2 }, t3: { id: 't3', name: 'C', order: 3 } };
    document.body.innerHTML = '<div id="task-list"><div class="section">' +
      ['t1', 't2', 't3'].map(i => '<div class="task-card" id="tc-' + i + '" data-id="' + i + '"></div>').join('') + '</div></div>';
  });
  it('writes only the changed order paths in one patchRoot, never writeState', async () => {
    await moveTask('t1', 1, admin);
    expect(patchRoot).toHaveBeenCalledTimes(1);
    expect(patchRoot).toHaveBeenCalledWith({ 'tasks/t1/order': 2, 'tasks/t2/order': 1 });
    expect(writeState).not.toHaveBeenCalled();
    expect(state.tasks.t1.order).toBe(2);
    expect(state.tasks.t3.order).toBe(3);
  });
  it('is admin-only', async () => {
    await moveTask('t1', 1, notAdmin);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(state.tasks.t1.order).toBe(1);
  });
  it('ignores the first card moving up and bad directions', async () => {
    await moveTask('t1', -1, admin);
    await moveTask('t1', 2, admin);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('keeps local state and toasts when the write fails', async () => {
    patchRoot.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'NET' }));
    await moveTask('t2', -1, admin);
    expect(state.tasks.t2.order).toBe(2);
    expect(showToast).toHaveBeenCalled();
  });
});

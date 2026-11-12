import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  appendHistory: vi.fn().mockResolvedValue({ ok: true }),
  removeHistoryEntry: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot, appendHistory, removeHistoryEntry } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { pushUndo } from '../src/undo.js';
import { offerSwap, acceptSwap, declineSwap, pendingSwapsFor, swapsHTML, MAX_SWAPS, SWAP_TTL_MS } from '../src/swaps.js';

const asAmy = () => 'Amy', asBen = () => 'Ben', asCat = () => 'Cat';
const offer = (id, over = {}) => ({ id, taskId: 't1', taskName: 'Dishes', from: 'Amy', to: 'Ben', offeredAt: Date.now(), lastDone: 0, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  state.members = { Amy: { name: 'Amy' }, Ben: { name: 'Ben' }, Cat: { name: 'Cat' } };
  state.tasks = { t1: { id: 't1', name: 'Dishes', person: 'Amy', done: false }, t2: { id: 't2', name: 'Bins', person: 'Ben', done: false } };
  state.swaps = {};
  state.history = [];
});

describe('offer', () => {
  it('a member offers their own pending chore to a named sibling (one multi-path patch)', async () => {
    expect(await offerSwap('t1', 'Ben', asAmy)).toBe(true);
    expect(patchRoot).toHaveBeenCalledTimes(1);
    const [key, val] = Object.entries(patchRoot.mock.calls[0][0])[0];
    expect(key).toMatch(/^swaps\/sw/);
    expect(val).toMatchObject({ taskId: 't1', taskName: 'Dishes', from: 'Amy', to: 'Ben' });
    expect(pendingSwapsFor('Ben')).toHaveLength(1);
  });
  it('wrong member (not the assignee) is rejected', async () => {
    expect(await offerSwap('t1', 'Cat', asBen)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('rejects done chores, self, unknown member and duplicate open offers', async () => {
    state.tasks.t1.done = true;
    expect(await offerSwap('t1', 'Ben', asAmy)).toBe(false);
    state.tasks.t1.done = false;
    expect(await offerSwap('t1', 'Amy', asAmy)).toBe(false);
    expect(await offerSwap('t1', 'Zed', asAmy)).toBe(false);
    state.swaps.s1 = offer('s1');
    expect(await offerSwap('t1', 'Cat', asAmy)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('is capped at 50 offers and toasts', async () => {
    for (let i = 0; i < MAX_SWAPS; i++) {
      state.tasks['x' + i] = { id: 'x' + i, name: 'X', person: 'Cat', done: false };
      state.swaps['s' + i] = offer('s' + i, { taskId: 'x' + i, from: 'Cat', to: 'Ben' });
    }
    expect(await offerSwap('t1', 'Ben', asAmy)).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('max 50'));
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('expired offers do not count towards the cap and are pruned in the same patch', async () => {
    state.swaps.old = offer('old', { taskId: 't2', from: 'Ben', to: 'Cat', offeredAt: Date.now() - SWAP_TTL_MS - 1 });
    expect(await offerSwap('t1', 'Ben', asAmy)).toBe(true);
    expect(patchRoot.mock.calls[0][0]['swaps/old']).toBeNull();
  });
  it('a failing write toasts and keeps local state clean', async () => {
    patchRoot.mockRejectedValueOnce(new Error('boom'));
    expect(await offerSwap('t1', 'Ben', asAmy)).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(state.swaps).toEqual({});
  });
});

describe('accept / decline', () => {
  beforeEach(() => { state.swaps.s1 = offer('s1'); });
  it('accept changes person, removes the offer in one patch, adds a history note and an undo', async () => {
    expect(await acceptSwap('s1', asBen)).toBe(true);
    expect(patchRoot).toHaveBeenCalledWith({ 'tasks/t1/person': 'Ben', 'swaps/s1': null });
    expect(state.tasks.t1.person).toBe('Ben');
    expect(state.swaps.s1).toBeUndefined();
    expect(appendHistory).toHaveBeenCalledWith(expect.objectContaining({ type: 'swap', person: 'Ben', from: 'Amy', points: 0 }));
    expect(pushUndo).toHaveBeenCalled();
    patchRoot.mockClear();
    await pushUndo.mock.calls[0][0].undo();
    expect(patchRoot).toHaveBeenCalledWith({ 'tasks/t1/person': 'Amy' });
    expect(removeHistoryEntry).toHaveBeenCalled();
  });
  it('only the named recipient can accept', async () => {
    expect(await acceptSwap('s1', asCat)).toBe(false);
    expect(await acceptSwap('s1', asAmy)).toBe(false);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(state.tasks.t1.person).toBe('Amy');
  });
  it('recipient declines (offer removed, chore unchanged)', async () => {
    expect(await declineSwap('s1', asBen)).toBe(true);
    expect(patchRoot).toHaveBeenCalledWith({ 'swaps/s1': null });
    expect(state.tasks.t1.person).toBe('Amy');
  });
  it('the offerer can cancel; a third member cannot decline', async () => {
    expect(await declineSwap('s1', asCat)).toBe(false);
    expect(await declineSwap('s1', asAmy)).toBe(true);
  });
  it('a double tap on Accept writes once', async () => {
    const [a, b] = await Promise.all([acceptSwap('s1', asBen), acceptSwap('s1', asBen)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(patchRoot).toHaveBeenCalledTimes(1);
  });
});

describe('expiry', () => {
  it('expires after 24 h', async () => {
    state.swaps.s1 = offer('s1', { offeredAt: Date.now() - SWAP_TTL_MS - 5 });
    expect(pendingSwapsFor('Ben')).toHaveLength(0);
    expect(await acceptSwap('s1', asBen)).toBe(false);
    expect(patchRoot).toHaveBeenCalledWith({ 'swaps/s1': null }); // cleaned up, not applied
    expect(state.tasks.t1.person).toBe('Amy');
  });
  it('expires when the chore is done, reset (lastDone changed) or reassigned', () => {
    state.swaps.s1 = offer('s1');
    expect(pendingSwapsFor('Ben')).toHaveLength(1);
    state.tasks.t1.done = true; expect(pendingSwapsFor('Ben')).toHaveLength(0);
    state.tasks.t1.done = false; state.tasks.t1.lastDone = 123; expect(pendingSwapsFor('Ben')).toHaveLength(0);
    state.tasks.t1.lastDone = 0; state.tasks.t1.person = 'Cat'; expect(pendingSwapsFor('Ben')).toHaveLength(0);
  });
});

describe('rendering', () => {
  it('escapes user text in the offers list', () => {
    const html = swapsHTML([offer('s1', { taskName: '<img onerror=x>' })]);
    expect(html).not.toContain('<img');
    expect(html).toContain('Accept');
  });
});

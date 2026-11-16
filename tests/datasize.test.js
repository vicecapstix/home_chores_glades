import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/modals.js', () => ({ openModal: vi.fn() }));
import { openModal } from '../src/modals.js';
import { stateSize, dataSizeHTML, openDataSize, WARN_BYTES } from '../src/datasize.js';

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '<div id="datasize-list"></div>';
  Object.assign(state, {
    members: { Amy: { name: 'Amy', pinHash: 'x'.repeat(64), points: 5 } },
    tasks: { t1: { id: 't1', name: 'Dishes' }, t2: { id: 't2', name: 'Bins' } },
    history: [{ a: 1 }, { a: 2 }, { a: 3 }], redemptions: { r1: {} }, templates: {}, rewards: { w1: { id: 'w1' } }, nextId: 3,
    uid: 'abc', admins: { u: 'Amy' }, parentEmail: true,
  });
});

describe('stateSize (#353)', () => {
  it('counts bytes of the database keys, excluding PIN hashes and local-only keys', () => {
    const s = stateSize(state);
    const expected = JSON.stringify({
      members: { Amy: { name: 'Amy', points: 5 } }, tasks: state.tasks, history: state.history, nextId: 3,
      templates: {}, rewards: state.rewards, redemptions: state.redemptions,
    }).length;
    expect(s.bytes).toBeGreaterThanOrEqual(expected - 40);
    expect(s.bytes).toBeLessThan(expected + 200);
    const withHash = JSON.stringify(state.members).length;
    expect(s.bytes).toBeLessThan(withHash + JSON.stringify(state.tasks).length + 300); // hash not included
    expect(JSON.stringify(s)).not.toContain('xxxxxxxx');
  });
  it('counts history, redemptions, templates, rewards and tasks', () => {
    expect(stateSize(state).counts).toEqual({ history: 3, redemptions: 1, templates: 0, rewards: 1, tasks: 2 });
  });
  it('measures UTF-8 bytes, not characters', () => {
    state.tasks.t1.name = '🧹🧹🧹';
    const a = stateSize(state).bytes;
    state.tasks.t1.name = 'abcdef';
    expect(a).toBeGreaterThan(stateSize(state).bytes);
  });
  it('does not mutate state (PIN hash stays)', () => {
    stateSize(state);
    expect(state.members.Amy.pinHash).toHaveLength(64);
  });
});

describe('dataSizeHTML (#353)', () => {
  it('shows size, capped counts and a monthly estimate with the stated assumption', () => {
    const h = dataSizeHTML(stateSize(state));
    expect(h).toContain('History 3 / 500');
    expect(h).toContain('Redemptions 1 / 100');
    expect(h).toMatch(/5 devices.*10 opens a day/);
    expect(h).toMatch(/per month/);
    expect(h).not.toContain('role="note"');
  });
  it('shows an amber note above 1 MB only', () => {
    expect(dataSizeHTML({ bytes: WARN_BYTES, counts: stateSize(state).counts })).not.toContain('role="note"');
    const h = dataSizeHTML({ bytes: WARN_BYTES + 1, counts: stateSize(state).counts });
    expect(h).toContain('role="note"');
    expect(h).toContain('datasize-warn');
  });
});

describe('openDataSize (#353)', () => {
  it('admin opens and fills the modal from memory (no firebase import needed)', () => {
    openDataSize(() => true);
    expect(openModal).toHaveBeenCalledWith('datasize-modal');
    expect(document.getElementById('datasize-list').innerHTML).toContain('Tasks 2');
  });
  it('a member opens nothing', () => {
    openDataSize(() => false);
    expect(openModal).not.toHaveBeenCalled();
    expect(document.getElementById('datasize-list').innerHTML).toBe('');
  });
});

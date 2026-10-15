import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { state, applySnapshot } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ patchRoot: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { patchRoot } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import * as R from '../src/rewards.js';

const admin = () => true;
const notAdmin = () => false;
const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');

function mountModal() {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  document.body.innerHTML = doc.getElementById('rewards-modal').outerHTML;
}
const fill = (name, cost, icon = '') => {
  document.getElementById('reward-name').value = name;
  document.getElementById('reward-cost').value = cost;
  document.getElementById('reward-icon').value = icon;
};

beforeEach(() => {
  vi.clearAllMocks();
  state.rewards = {};
  mountModal();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('validateReward', () => {
  it('accepts a valid reward and defaults the icon', () => {
    expect(R.validateReward(' Movie night ', '20', '')).toEqual({ reward: { name: 'Movie night', cost: 20, icon: '🎁' } });
  });
  it('rejects empty names and bad costs', () => {
    expect(R.validateReward('', 5).error).toBeTruthy();
    for (const c of [0, -3, 1.5, 1000, 'abc', '']) expect(R.validateReward('x', c).error).toBeTruthy();
  });
  it('clamps long names and icons', () => {
    const r = R.validateReward('x'.repeat(100), 5, '🍕🍕🍕🍕').reward;
    expect(r.name.length).toBe(R.MAX_NAME);
    expect(Array.from(r.icon).length).toBe(2);
  });
});

describe('admin CRUD writes path updates, never writeState', () => {
  it('adds a reward via patchRoot rewards/<id>', async () => {
    fill('Pizza', '15', '🍕');
    await R.saveReward(admin);
    expect(patchRoot).toHaveBeenCalledTimes(1);
    const [fields] = patchRoot.mock.calls[0];
    const [path] = Object.keys(fields);
    expect(path).toMatch(/^rewards\/r\d+$/);
    expect(fields[path]).toEqual({ id: path.slice(8), name: 'Pizza', cost: 15, icon: '🍕' });
    expect(Object.keys(state.rewards)).toHaveLength(1);
  });
  it('edits an existing reward in place (same id)', async () => {
    state.rewards = { r1: { id: 'r1', name: 'Old', cost: 5, icon: '🎁' } };
    R.editReward('r1', admin);
    expect(document.getElementById('reward-name').value).toBe('Old');
    document.getElementById('reward-cost').value = '9';
    await R.saveReward(admin);
    expect(patchRoot).toHaveBeenCalledWith({ 'rewards/r1': { id: 'r1', name: 'Old', cost: 9, icon: '🎁' } });
    expect(Object.keys(state.rewards)).toEqual(['r1']);
  });
  it('deletes by nulling the path after confirm', async () => {
    state.rewards = { r1: { id: 'r1', name: 'Old', cost: 5, icon: '🎁' } };
    await R.deleteReward('r1', admin);
    expect(patchRoot).toHaveBeenCalledWith({ 'rewards/r1': null });
    expect(state.rewards.r1).toBeUndefined();
  });
  it('does not delete when confirm is declined', async () => {
    window.confirm.mockReturnValue(false);
    state.rewards = { r1: { id: 'r1', name: 'Old', cost: 5, icon: '🎁' } };
    await R.deleteReward('r1', admin);
    expect(patchRoot).not.toHaveBeenCalled();
  });
  it('enforces the 50 reward cap on add but still allows edits at the cap', async () => {
    state.rewards = Object.fromEntries(Array.from({ length: 50 }, (_, i) => ['r' + i, { id: 'r' + i, name: 'R' + i, cost: 1, icon: '🎁' }]));
    fill('One too many', '5');
    await R.saveReward(admin);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('limit'));
    R.editReward('r3', admin);
    document.getElementById('reward-cost').value = '7';
    await R.saveReward(admin);
    expect(patchRoot).toHaveBeenCalledTimes(1);
  });
  it('shows a toast for invalid input and writes nothing', async () => {
    fill('', '5');
    await R.saveReward(admin);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });
  it('surfaces write failures', async () => {
    patchRoot.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'PERMISSION_DENIED' }));
    fill('Pizza', '15');
    await R.saveReward(admin);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('PERMISSION_DENIED'));
    expect(Object.keys(state.rewards)).toHaveLength(0);
  });
});

describe('guards', () => {
  it('members cannot add, edit or delete', async () => {
    state.rewards = { r1: { id: 'r1', name: 'Old', cost: 5, icon: '🎁' } };
    fill('Hack', '1');
    await R.saveReward(notAdmin);
    R.editReward('r1', notAdmin);
    await R.deleteReward('r1', notAdmin);
    expect(patchRoot).not.toHaveBeenCalled();
    expect(state.rewards.r1.name).toBe('Old');
    expect(document.getElementById('reward-save').textContent).toBe('Add reward');
  });
});

describe('rendering', () => {
  const sample = { a: { id: 'a', name: 'Zebra', cost: 20, icon: '🦓' }, b: { id: 'b', name: 'Apple', cost: 5, icon: '🍎' } };
  it('sorts by cost and hides edit controls from members', () => {
    const out = R.rewardsHTML(sample, false);
    expect(out.indexOf('Apple')).toBeLessThan(out.indexOf('Zebra'));
    expect(out).not.toContain('<button');
  });
  it('shows Edit/Delete to admins', () => {
    expect(R.rewardsHTML(sample, true).match(/<button/g)).toHaveLength(4);
  });
  it('escapes names and icons (XSS)', () => {
    const out = R.rewardsHTML({ x: { id: 'x', name: '<img src=x onerror=alert(1)>', cost: 1, icon: '<b>' } }, true);
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<b>');
    expect(out).toContain('&lt;img');
  });
  it('shows an empty state', () => {
    expect(R.rewardsHTML({}, false)).toContain('No rewards yet');
  });
  it('openRewards shows the modal; form visible only for admins', () => {
    R.openRewards(notAdmin);
    expect(document.getElementById('rewards-modal').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('rewards-admin').classList.contains('hidden')).toBe(true);
    R.openRewards(admin);
    expect(document.getElementById('rewards-admin').classList.contains('hidden')).toBe(false);
  });
  it('refreshRewards re-renders only while the modal is open', () => {
    state.rewards = sample;
    R.refreshRewards();
    expect(document.getElementById('rewards-list').innerHTML).toBe('');
    R.openRewards(notAdmin);
    state.rewards = { c: { id: 'c', name: 'Live update', cost: 3, icon: '✨' } };
    R.refreshRewards();
    expect(document.getElementById('rewards-list').textContent).toContain('Live update');
  });
});

describe('state wiring', () => {
  it('applySnapshot stores rewards and defaults to {}', () => {
    applySnapshot({ rewards: { r: { id: 'r' } } });
    expect(state.rewards).toEqual({ r: { id: 'r' } });
    applySnapshot({});
    expect(state.rewards).toEqual({});
  });
  it('modal markup is a labelled dialog following the .hidden pattern', () => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const m = doc.getElementById('rewards-modal');
    expect(m.className).toBe('hidden');
    expect(m.getAttribute('role')).toBe('dialog');
    expect(m.hasAttribute('style')).toBe(false);
    expect(m.querySelector('[style*="display"]')).toBeNull();
    const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
    expect(css).toMatch(/#rewards-modal\.hidden/);
  });
});

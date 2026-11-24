import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), get READONLY() { return globalThis.__RO === true; } }));
vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  reserveStock: vi.fn().mockResolvedValue(true),
  releaseStock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchRoot } from '../src/firebase.js';
import * as R from '../src/rewards.js';

const admin = () => true, notAdmin = () => false;
const val = (id, v) => { document.getElementById(id).value = v; };
const paths = () => Object.keys(patchRoot.mock.calls[0][0]);

beforeEach(() => {
  vi.clearAllMocks(); globalThis.__RO = false;
  document.body.innerHTML = '<input id="reward-name"><input id="reward-cost"><input id="reward-icon"><input id="reward-perweek"><input id="reward-stock"><button id="reward-save"></button><button id="reward-cancel"></button>';
  state.rewards = { r1: { id: 'r1', name: 'Cinema', cost: 20, icon: '🎬', stock: 3 } };
});

describe('editing a reward does not overwrite reserved stock (#390)', () => {
  it('rename-only save after a request reserved a copy leaves stock untouched', async () => {
    R.editReward('r1', admin);
    state.rewards.r1.stock = 2; // a child's request reserved one copy while the form was open
    val('reward-name', 'Cinema trip');
    await R.saveReward(admin);
    expect(paths()).not.toContain('rewards/r1/stock');
    expect(patchRoot.mock.calls[0][0]['rewards/r1/name']).toBe('Cinema trip');
    expect(state.rewards.r1.stock).toBe(2);
  });

  it('a stock change is applied relative to the live value', async () => {
    R.editReward('r1', admin); // shown 3
    state.rewards.r1.stock = 2; // one reserved meanwhile
    val('reward-stock', '5'); // admin adds two copies
    await R.saveReward(admin);
    expect(patchRoot.mock.calls[0][0]['rewards/r1/stock']).toBe(4);
    expect(state.rewards.r1.stock).toBe(4);
  });

  it('clamps to 0..99', async () => {
    R.editReward('r1', admin);
    state.rewards.r1.stock = 98;
    val('reward-stock', '99');
    await R.saveReward(admin);
    expect(patchRoot.mock.calls[0][0]['rewards/r1/stock']).toBe(99);
  });

  it('blank stock makes it unlimited, and a typed number limits an unlimited reward', async () => {
    R.editReward('r1', admin);
    val('reward-stock', '');
    await R.saveReward(admin);
    expect(patchRoot.mock.calls[0][0]['rewards/r1/stock']).toBeNull();
    patchRoot.mockClear();
    R.editReward('r1', admin);
    val('reward-stock', '7');
    await R.saveReward(admin);
    expect(patchRoot.mock.calls[0][0]['rewards/r1/stock']).toBe(7);
  });

  it('clearing the weekly limit still removes it', async () => {
    state.rewards.r1.perWeek = 2;
    R.editReward('r1', admin);
    val('reward-perweek', '');
    await R.saveReward(admin);
    expect(patchRoot.mock.calls[0][0]['rewards/r1/perWeek']).toBeNull();
  });

  it('a new reward is still written whole with its validated stock', async () => {
    val('reward-name', 'Pizza'); val('reward-cost', '15'); val('reward-stock', '4');
    await R.saveReward(admin);
    const [path, full] = Object.entries(patchRoot.mock.calls[0][0])[0];
    expect(path).toMatch(/^rewards\/r\d+$/);
    expect(full).toMatchObject({ name: 'Pizza', cost: 15, stock: 4 });
  });

  it('non-admin and READONLY write nothing', async () => {
    R.editReward('r1', admin);
    val('reward-name', 'X');
    await R.saveReward(notAdmin);
    globalThis.__RO = true;
    await R.saveReward(admin);
    expect(patchRoot).not.toHaveBeenCalled();
  });
});

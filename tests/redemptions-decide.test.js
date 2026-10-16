import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

let decideOk = true;
vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  spendPoints: vi.fn().mockResolvedValue(true),
  refundPoints: vi.fn().mockResolvedValue(undefined),
  decideRedemption: vi.fn(async () => decideOk),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { decideRedemption, refundPoints } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import * as D from '../src/redemptions.js';
import * as R from '../src/rewards.js';

const admin = () => true;
const notAdmin = () => false;
const asDad = () => 'Dad';

function req(over = {}) {
  return { id: 'rd1', rewardId: 'r1', rewardName: 'Movie night', cost: 20, member: 'Alice', requestedAt: 1000, status: 'pending', ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  decideOk = true;
  state.members = { Alice: { name: 'Alice', role: 'member', points: 30 }, Dad: { name: 'Dad', role: 'admin', points: 0 } };
  state.rewards = {};
  state.redemptions = { rd1: req() };
});

describe('decideRequest', () => {
  it('approve marks the entry decided and does not refund', async () => {
    await D.decideRequest('rd1', 'approved', admin, asDad);
    expect(decideRedemption).toHaveBeenCalledWith('rd1', 'approved', 'Dad');
    expect(refundPoints).not.toHaveBeenCalled();
    expect(state.redemptions.rd1.status).toBe('approved');
    expect(state.redemptions.rd1.decidedBy).toBe('Dad');
  });
  it('deny refunds the cost to the requester', async () => {
    await D.decideRequest('rd1', 'denied', admin, asDad);
    expect(decideRedemption).toHaveBeenCalledWith('rd1', 'denied', 'Dad');
    expect(refundPoints).toHaveBeenCalledWith('Alice', 20);
    expect(state.redemptions.rd1.status).toBe('denied');
  });
  it('deny of a removed member skips the refund without crashing', async () => {
    delete state.members.Alice;
    await D.decideRequest('rd1', 'denied', admin, asDad);
    expect(refundPoints).not.toHaveBeenCalled();
  });
  it('deciding twice is a no-op (already decided locally)', async () => {
    await D.decideRequest('rd1', 'denied', admin, asDad);
    await D.decideRequest('rd1', 'denied', admin, asDad);
    expect(decideRedemption).toHaveBeenCalledTimes(1);
    expect(refundPoints).toHaveBeenCalledTimes(1);
  });
  it('lost race (transaction aborts) does not refund or change local state', async () => {
    decideOk = false;
    await D.decideRequest('rd1', 'denied', admin, asDad);
    expect(refundPoints).not.toHaveBeenCalled();
    expect(state.redemptions.rd1.status).toBe('pending');
    expect(showToast).toHaveBeenCalledWith('Already decided');
  });
  it('concurrent taps decide once', async () => {
    await Promise.all([D.decideRequest('rd1', 'denied', admin, asDad), D.decideRequest('rd1', 'denied', admin, asDad)]);
    expect(decideRedemption).toHaveBeenCalledTimes(1);
  });
  it('non-admin cannot decide', async () => {
    await D.decideRequest('rd1', 'approved', notAdmin, () => 'Alice');
    expect(decideRedemption).not.toHaveBeenCalled();
    expect(state.redemptions.rd1.status).toBe('pending');
  });
  it('ignores unknown ids and invalid statuses', async () => {
    await D.decideRequest('nope', 'approved', admin, asDad);
    await D.decideRequest('rd1', 'pending', admin, asDad);
    expect(decideRedemption).not.toHaveBeenCalled();
  });
  it('flags a failed refund after deny so the admin can fix it', async () => {
    refundPoints.mockRejectedValueOnce(new Error('net'));
    await D.decideRequest('rd1', 'denied', admin, asDad);
    expect(showToast.mock.calls.at(-1)[0]).toMatch(/refund failed for Alice/);
  });
});

describe('decidedFor / UI', () => {
  it('lists a member\'s decided requests newest first, capped at 5', () => {
    state.redemptions = {};
    for (let i = 0; i < 7; i++) state.redemptions['d' + i] = req({ id: 'd' + i, status: 'approved', decidedAt: i });
    state.redemptions.other = req({ id: 'other', member: 'Bob', status: 'denied', decidedAt: 99 });
    state.redemptions.pend = req({ id: 'pend' });
    const rows = D.decidedFor('Alice');
    expect(rows).toHaveLength(5);
    expect(rows[0].id).toBe('d6');
  });

  function mount() {
    document.body.innerHTML = '<div id="rewards-list"></div><div id="rewards-pending"></div><form id="rewards-admin"></form>' +
      '<span id="rewards-badge" class="hidden"></span><div id="rewards-modal" class="hidden"></div>';
  }
  it('admin sees Approve/Deny buttons and a badge count; <script> names are escaped', () => {
    mount();
    state.redemptions.rd1 = req({ rewardName: '<script>x</script>' });
    R.openRewards(admin, asDad);
    const html = document.getElementById('rewards-pending').innerHTML;
    expect(html).toContain('window.approveRedemption');
    expect(html).toContain('window.denyRedemption');
    expect(document.querySelector('#rewards-pending script')).toBeNull();
    expect(document.getElementById('rewards-badge').textContent).toBe('1');
    expect(document.getElementById('rewards-badge').classList.contains('hidden')).toBe(false);
  });
  it('member sees outcomes but no decision buttons or badge', () => {
    mount();
    state.redemptions = { rd1: req({ status: 'denied', decidedAt: 5 }), rd2: req({ id: 'rd2', status: 'approved', decidedAt: 6 }) };
    R.openRewards(notAdmin, () => 'Alice');
    const html = document.getElementById('rewards-pending').innerHTML;
    expect(html).toContain('Denied — points refunded');
    expect(html).toContain('Approved');
    expect(html).not.toContain('approveRedemption');
    R.updateRewardsBadge();
    expect(document.getElementById('rewards-badge').classList.contains('hidden')).toBe(true);
  });
});

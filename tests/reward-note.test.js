import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  spendPoints: vi.fn(async () => true),
  refundPoints: vi.fn().mockResolvedValue(undefined),
  takePendingRedemption: vi.fn().mockResolvedValue(true), reserveStock: vi.fn().mockResolvedValue(true), releaseStock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
vi.mock('../src/modals.js', () => ({ openModal: vi.fn(), closeModal: vi.fn() }));
import { patchRoot, spendPoints } from '../src/firebase.js';
import { requestReward, cleanNote } from '../src/redemptions.js';
import { toGiveHTML } from '../src/rewards.js';
import { historyHTML, redemptionEvents } from '../src/history.js';

const XSS = '<img src=x onerror=alert(1)>';
const asAlice = () => 'Alice';
const sent = () => Object.values(patchRoot.mock.calls[0][0])[0];

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  state.members = { Alice: { name: 'Alice', role: 'member', points: 50 } };
  state.rewards = { r1: { id: 'r1', name: 'Movie night', cost: 20 } };
  state.redemptions = {};
});

describe('cleanNote (#404)', () => {
  it('trims, collapses whitespace and cuts to 60 chars', () => {
    expect(cleanNote('  for   Saturday ')).toBe('for Saturday');
    expect(cleanNote('x'.repeat(100))).toHaveLength(60);
  });
  it('returns "" for empty, blank or non-string input', () => {
    expect(cleanNote('')).toBe(''); expect(cleanNote('   ')).toBe('');
    expect(cleanNote(undefined)).toBe(''); expect(cleanNote(42)).toBe('');
  });
});

describe('requestReward stores the note', () => {
  it('saves a trimmed note on the redemption', async () => {
    await requestReward('r1', asAlice, '  for Saturday ');
    expect(sent()).toMatchObject({ rewardId: 'r1', member: 'Alice', status: 'pending', note: 'for Saturday' });
  });
  it('cuts an over-long note to 60 chars', async () => {
    await requestReward('r1', asAlice, 'y'.repeat(200));
    expect(sent().note).toHaveLength(60);
  });
  it('omits the field when the note is empty or missing', async () => {
    await requestReward('r1', asAlice, '   ');
    expect('note' in sent()).toBe(false);
    vi.clearAllMocks();
    await requestReward('r1', asAlice);
    expect('note' in sent()).toBe(false);
  });
  it('clears the note input after a successful request', async () => {
    document.body.innerHTML = '<input id="reward-note" value="for Saturday">';
    await requestReward('r1', asAlice, 'for Saturday');
    expect(document.getElementById('reward-note').value).toBe('');
  });
  it('keeps the note input when the request fails', async () => {
    document.body.innerHTML = '<input id="reward-note" value="for Saturday">';
    state.members.Alice.points = 0;
    await requestReward('r1', asAlice, 'for Saturday');
    expect(patchRoot).not.toHaveBeenCalled();
    expect(document.getElementById('reward-note').value).toBe('for Saturday');
  });
  it('a member that does not exist cannot request (no spend, no write)', async () => {
    await requestReward('r1', () => 'Nobody', 'hi');
    expect(spendPoints).not.toHaveBeenCalled();
    expect(patchRoot).not.toHaveBeenCalled();
  });
});

describe('note is shown, escaped, in the parent and history views', () => {
  const r = { id: 'rd1', rewardId: 'r1', rewardName: 'Movie night', cost: 20, member: 'Alice', requestedAt: 1000, status: 'approved', decidedAt: 2000, note: XSS };
  it('To give list', () => {
    const html = toGiveHTML([r]);
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
  });
  it('History row', () => {
    const html = historyHTML([], ['Alice'], '', { rd1: r });
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
    expect(redemptionEvents({ rd1: { ...r, note: 'for Saturday' } })[0].label).toContain('for Saturday');
  });
  it('History row for a request without a note is unchanged', () => {
    expect(redemptionEvents({ rd1: { ...r, note: undefined } })[0].label).toBe('🎁 Movie night (requested)');
  });
});

describe('rewards modal lists (member pending + admin awaiting approval)', () => {
  it('renders the note escaped in both', async () => {
    document.body.innerHTML = '<div id="rewards-list"></div><div id="rewards-pending"></div><div id="rewards-note-wrap" class="hidden"><input id="reward-note"></div><span id="rewards-badge"></span>';
    const { openRewards } = await import('../src/rewards.js');
    state.members.Dad = { name: 'Dad', role: 'admin', points: 0 };
    state.redemptions = { rd1: { id: 'rd1', rewardId: 'r1', rewardName: 'Movie night', cost: 20, member: 'Alice', requestedAt: 1, status: 'pending', note: XSS } };
    openRewards(() => false, () => 'Alice');
    const mine = document.getElementById('rewards-pending').innerHTML;
    expect(mine).toContain('&lt;img'); expect(mine).not.toContain('<img');
    expect(document.getElementById('rewards-note-wrap').classList.contains('hidden')).toBe(false);
    openRewards(() => true, () => 'Dad');
    const admin = document.getElementById('rewards-pending').innerHTML;
    expect(admin).toContain('&lt;img'); expect(admin).not.toContain('<img');
  });
});

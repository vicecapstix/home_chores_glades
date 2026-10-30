import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  patchRoot: vi.fn().mockResolvedValue(undefined),
  takeClaim: vi.fn().mockResolvedValue(true),
  adjustMemberPoints: vi.fn().mockResolvedValue({ ok: true, reason: '' }),
  appendHistory: vi.fn().mockResolvedValue({ ok: true }),
  removeHistoryEntry: vi.fn(),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { claimsMineHTML, renderClaims } from '../src/claims.js';
import { refreshRewards } from '../src/rewards.js';

const admin = () => true, notAdmin = () => false;
const XSS = '<img src=x onerror=alert(1)>';

function mount() {
  document.body.innerHTML = '<div id="claims-section"></div><form id="claim-form" class="claim-form hidden"></form>' +
    '<span id="rewards-badge" class="hidden"></span><div id="rewards-modal" class="hidden"></div>';
}

beforeEach(() => {
  mount();
  state.members = { Amy: { name: 'Amy', role: 'member' }, Ben: { name: 'Ben', role: 'member' }, Dad: { name: 'Dad', role: 'admin' } };
  state.redemptions = {};
  state.claims = {
    c1: { id: 'c1', member: 'Amy', name: 'Carried shopping', points: 5, requestedAt: 1 },
    c2: { id: 'c2', member: 'Ben', name: 'Washed car', points: 8, requestedAt: 2 },
  };
});

describe('claims rendering (#224)', () => {
  it("escapes the job name in the member's own waiting list", () => {
    const html = claimsMineHTML([{ id: 'c9', member: 'Amy', name: XSS, points: 3 }]);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
  it('a member sees only their own claims, no Approve/Deny, and the form', () => {
    renderClaims(notAdmin, 'Amy');
    const html = document.getElementById('claims-section').innerHTML;
    expect(html).toContain('Carried shopping');
    expect(html).not.toContain('Washed car');
    expect(html).not.toContain('approveClaim');
    expect(document.getElementById('claim-form').classList.contains('hidden')).toBe(false);
  });
  it("an admin sees everyone's claims with Approve and Deny", () => {
    renderClaims(admin, 'Dad');
    const html = document.getElementById('claims-section').innerHTML;
    expect(html).toContain('Carried shopping');
    expect(html).toContain('Washed car');
    expect(html).toContain('approveClaim');
    expect(html).toContain('denyClaim');
  });
  it('the form stays hidden with no signed-in member', () => {
    renderClaims(notAdmin, '');
    expect(document.getElementById('claim-form').classList.contains('hidden')).toBe(true);
  });
  it("the admin's rewards badge counts pending claims", () => {
    refreshRewards(admin);
    const b = document.getElementById('rewards-badge');
    expect(b.textContent).toBe('2');
    expect(b.classList.contains('hidden')).toBe(false);
  });
});

import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/firebase.js', () => ({ patchRoot: vi.fn(), patchPaths: vi.fn(), patchMember: vi.fn(), spendPoints: vi.fn(), refundPoints: vi.fn(), decideRedemption: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), MAX_TEMPLATES: 20, MAX_TEMPLATE_TASKS: 100 }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { validateBackup } from '../src/restore.js';

const backup = (m) => JSON.stringify({ schemaVersion: 1, nextId: 1, members: { Amy: { name: 'Amy', role: 'admin', ...m } }, tasks: {} });

describe('restore keeps a negative points balance (#380)', () => {
  it('points -5 stays -5', () => {
    const r = validateBackup(backup({ points: -5, weekPoints: 0, streak: 0, completedCount: 0 }));
    expect(r.ok).toBe(true);
    expect(r.clean.members.Amy.points).toBe(-5);
  });
  it('weekPoints, streak and completedCount still clamp to >= 0', () => {
    const m = validateBackup(backup({ points: 3, weekPoints: -2, streak: -1, completedCount: -4 })).clean.members.Amy;
    expect([m.points, m.weekPoints, m.streak, m.completedCount]).toEqual([3, 0, 0, 0]);
  });
  it('non-numeric points become 0', () => {
    expect(validateBackup(backup({ points: 'abc' })).clean.members.Amy.points).toBe(0);
  });
});

import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/firebase.js', () => ({ patchRoot: vi.fn(), patchPaths: vi.fn(), patchMember: vi.fn(), spendPoints: vi.fn(), refundPoints: vi.fn(), decideRedemption: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), MAX_TEMPLATES: 20, MAX_TEMPLATE_TASKS: 100 }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { validateBackup } from '../src/restore.js';

const backup = history => ({
  schemaVersion: 1, exportedAt: new Date(2026, 9, 19).toISOString(), nextId: 10,
  members: { Al: { name: 'Al', role: 'admin' } }, tasks: {}, history, templates: {}, rewards: {}, redemptions: {},
});
const entries = n => Array.from({ length: n }, (_, i) => ({ completedAt: i, points: 1, person: 'Al' }));

describe('restore history cap keeps the newest entries (#250)', () => {
  it('600 entries -> newest 500 (t100..t599), oldest-first', () => {
    const h = validateBackup(backup(entries(600))).clean.history;
    expect(h).toHaveLength(500);
    expect(h[0].completedAt).toBe(100);
    expect(h[499].completedAt).toBe(599);
  });
  it('500 or fewer entries are unchanged', () => {
    const h = validateBackup(backup(entries(3))).clean.history;
    expect(h.map(e => e.completedAt)).toEqual([0, 1, 2]);
    expect(validateBackup(backup(entries(500))).clean.history[0].completedAt).toBe(0);
  });
});

import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
vi.mock('../src/firebase.js', () => ({ patchPaths: vi.fn(), patchRoot: vi.fn(), patchMember: vi.fn() }));
import { validateChoreFile, addPayload } from '../src/chorefile.js';

const wrap = chores => ({ kind: 'familyflow-chores', schemaVersion: 1, chores });

describe('chore file import validation (#326)', () => {
  it('stores intervalDays as a number, not the raw string', () => {
    const r = validateChoreFile(wrap([{ name: 'Pool', freq: 'interval', intervalDays: '5' }]), {});
    expect(r.chores).toHaveLength(1);
    expect(r.chores[0].intervalDays).toBe(5);
    const t = addPayload(r.chores, 1, 1000).paths['tasks/t1000'];
    expect(typeof t.intervalDays).toBe('number');
  });

  it('rejects impossible calendar dates for one-off chores', () => {
    for (const dueDate of ['2026-02-30', '2026-13-45', '2026-00-10']) {
      const r = validateChoreFile(wrap([{ name: 'Pay bill', freq: 'once', dueDate }]), {});
      expect(r.chores, dueDate).toHaveLength(0);
      expect(r.invalid, dueDate).toHaveLength(1);
    }
  });

  it('still accepts a real date and a once chore with no date', () => {
    const r = validateChoreFile(wrap([
      { name: 'A', freq: 'once', dueDate: '2026-02-28' },
      { name: 'B', freq: 'once' },
      { name: 'C', freq: 'once', dueDate: '2028-02-29' },
    ]), {});
    expect(r.invalid).toHaveLength(0);
    expect(r.chores.map(c => c.name)).toEqual(['A', 'B', 'C']);
  });
});

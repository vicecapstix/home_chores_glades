import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/firebase.js', () => ({}));
vi.mock('../src/config.js', () => ({ READONLY: false }));
import { buildBackup, backupFilename, downloadBackup } from '../src/backup.js';

const NOW = new Date(2026, 9, 19, 9, 0, 0);
beforeEach(() => {
  state.members = { Al: { name: 'Al', role: 'admin', pinHash: 'abc', points: 5 }, Bo: { name: 'Bo', role: 'member', pinHash: '', points: 1 } };
  state.tasks = { t1: { id: 't1', name: 'Dishes' } };
  state.history = [{ taskId: 't1', person: 'Al', completedAt: 1, points: 1 }];
  state.templates = { tpl1: { id: 'tpl1', name: 'T', tasks: [] } };
  state.rewards = { r1: { id: 'r1', name: 'Pizza' } };
  state.redemptions = { x1: { id: 'x1' } };
  state.nextId = 7;
});

describe('backup (#93)', () => {
  it('has the expected shape', () => {
    const b = buildBackup(state, NOW);
    expect(Object.keys(b).sort()).toEqual(['exportedAt', 'history', 'members', 'nextId', 'redemptions', 'rewards', 'schemaVersion', 'tasks', 'templates']);
    expect(b.schemaVersion).toBe(1);
    expect(b.exportedAt).toBe(NOW.toISOString());
    expect(b.nextId).toBe(7);
    expect(b.tasks.t1.name).toBe('Dishes');
    expect(b.members.Al.points).toBe(5);
    expect(b.history).toHaveLength(1);
  });
  it('strips pinHash without mutating state', () => {
    const b = buildBackup(state, NOW);
    expect(JSON.stringify(b)).not.toContain('pinHash');
    expect(JSON.stringify(b)).not.toContain('abc');
    expect(state.members.Al.pinHash).toBe('abc');
  });
  it('names the file by local date', () => {
    expect(backupFilename(NOW)).toBe('familyflow-backup-2026-10-19.json');
  });
  describe('guard', () => {
    beforeEach(() => {
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
      globalThis.URL.revokeObjectURL = vi.fn();
    });
    it('does nothing for non-admin', () => {
      downloadBackup(() => false);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });
    it('downloads for admin', () => {
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      downloadBackup(() => true);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalled();
    });
  });
});

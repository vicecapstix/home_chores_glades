import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), get READONLY() { return globalThis.__RO === true; } }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import * as B from '../src/backupreminder.js';
import { downloadBackup } from '../src/backup.js';

const DAY = 86400000;
const NOW = new Date(2026, 10, 19, 12, 0, 0).getTime();
const admin = () => true, member = () => false;
const banner = () => document.getElementById('backup-reminder');
const shown = () => !banner().classList.contains('hidden');
const text = () => document.getElementById('backup-reminder-text').textContent;

beforeEach(() => {
  B._resetBackupReminder(); localStorage.clear(); globalThis.__RO = false;
  document.body.innerHTML = '<div id="backup-reminder" class="backup-reminder hidden"><span id="backup-reminder-text"></span></div>';
  state.members = { Dad: { name: 'Dad', role: 'admin' } };
  state.tasks = { t1: { id: 't1', name: 'Dishes' } };
});
afterEach(() => vi.unstubAllGlobals());

describe('reminderStatus (pure)', () => {
  it('29 days: no; 30 days: yes; never: yes', () => {
    expect(B.reminderStatus(NOW - 29 * DAY, 0, NOW)).toEqual({ show: false, days: 29 });
    expect(B.reminderStatus(NOW - 30 * DAY, 0, NOW)).toEqual({ show: true, days: 30 });
    expect(B.reminderStatus(0, 0, NOW)).toEqual({ show: true, days: null });
  });
  it('a snooze hides it until it ends', () => {
    expect(B.reminderStatus(0, NOW + DAY, NOW).show).toBe(false);
    expect(B.reminderStatus(0, NOW - 1, NOW).show).toBe(true);
  });
});

describe('banner', () => {
  it('shows for an admin who never backed up', () => {
    B.renderBackupReminder(admin, NOW);
    expect(shown()).toBe(true);
    expect(text()).toMatch(/No backup/);
  });
  it('shows "Last backup: N days ago" at 30 days and hides at 29', () => {
    localStorage.setItem('ff_backup_last', String(NOW - 30 * DAY));
    B.renderBackupReminder(admin, NOW);
    expect(text()).toBe('Last backup: 30 days ago.');
    expect(shown()).toBe(true);
    localStorage.setItem('ff_backup_last', String(NOW - 29 * DAY));
    B.renderBackupReminder(admin, NOW);
    expect(shown()).toBe(false);
  });
  it('dismiss hides it for 7 days on this device, then it returns', () => {
    B.renderBackupReminder(admin, NOW);
    B.dismissBackupReminder(NOW);
    expect(shown()).toBe(false);
    B.renderBackupReminder(admin, NOW + 6 * DAY);
    expect(shown()).toBe(false);
    B.renderBackupReminder(admin, NOW + 7 * DAY + 1);
    expect(shown()).toBe(true);
  });
  it('never for a member, on the TV, or when there is nothing to back up', () => {
    B.renderBackupReminder(member, NOW);
    expect(shown()).toBe(false);
    globalThis.__RO = true;
    B.renderBackupReminder(admin, NOW);
    expect(shown()).toBe(false);
    globalThis.__RO = false;
    state.tasks = {};
    B.renderBackupReminder(admin, NOW);
    expect(shown()).toBe(false);
  });
  it('READONLY cannot dismiss (no write to storage)', () => {
    globalThis.__RO = true;
    B.dismissBackupReminder(NOW);
    expect(localStorage.getItem('ff_backup_snooze')).toBeNull();
  });
  it('works when storage is blocked: dismiss still holds in memory', () => {
    vi.stubGlobal('localStorage', { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
    B.dismissBackupReminder(NOW + 100 * DAY);
    B.renderBackupReminder(admin, NOW + 100 * DAY + 1);
    expect(shown()).toBe(false);
  });
});

describe('recording a backup', () => {
  it('a successful download stores the date and hides the banner', () => {
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn();
    B.renderBackupReminder(admin, Date.now());
    expect(shown()).toBe(true);
    expect(downloadBackup(admin)).toBe(true);
    expect(Number(localStorage.getItem('ff_backup_last'))).toBeGreaterThan(0);
    expect(shown()).toBe(false);
  });
  it('a member or READONLY download stores nothing', () => {
    expect(downloadBackup(member)).toBe(false);
    globalThis.__RO = true;
    expect(downloadBackup(admin)).toBe(false);
    expect(localStorage.getItem('ff_backup_last')).toBeNull();
  });
});

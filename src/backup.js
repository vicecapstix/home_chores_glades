import { state } from './state.js';
import { READONLY } from './config.js';
import { localDateStr } from './utils.js';
import { showToast } from './ui.js';

export const BACKUP_SCHEMA_VERSION = 1;

const copy = v => JSON.parse(JSON.stringify(v));

// Pure: build a backup object from state. PIN hashes are never included.
export function buildBackup(s = state, now = new Date()) {
  const members = {};
  for (const [k, m] of Object.entries(s.members || {})) {
    const { pinHash, ...rest } = m || {}; // eslint-disable-line no-unused-vars
    members[k] = copy(rest);
  }
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    nextId: s.nextId,
    members,
    tasks: copy(s.tasks || {}),
    history: copy(s.history || []),
    templates: copy(s.templates || {}),
    rewards: copy(s.rewards || {}),
    redemptions: copy(s.redemptions || {}),
  };
}

export function backupFilename(now = new Date()) {
  return 'familyflow-backup-' + localDateStr(now) + '.json';
}

// Admin-only. Uses local state only: no Firebase read or write.
export function downloadBackup(isAdminFn) {
  if (READONLY || !isAdminFn()) return false;
  try {
    const now = new Date();
    const blob = new Blob([JSON.stringify(buildBackup(state, now), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename(now);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Backup downloaded');
    return true;
  } catch (e) {
    showToast('Backup failed');
    return false;
  }
}

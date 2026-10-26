// Admin restore from a JSON backup (#175). The file never leaves the device.
// Flow: pick file -> validate + summary -> type RESTORE -> safety backup download -> one patchRoot.
import { state } from './state.js';
import { READONLY, HISTORY_CAP } from './config.js';
import { patchRoot } from './firebase.js';
import { showToast, MAX_TEMPLATES, MAX_TEMPLATE_TASKS } from './ui.js';
import { openModal, closeModal } from './modals.js';
import { validateMemberName } from './members.js';
import { validateReward, MAX_REWARDS } from './rewards.js';
import { MAX_REDEMPTIONS } from './redemptions.js';
import { BACKUP_SCHEMA_VERSION, downloadBackup } from './backup.js';
import { esc } from './utils.js';

export const CONFIRM_WORD = 'RESTORE';
const FREQS = ['daily', 'weekdays', 'weekly', 'fortnightly', 'monthly', 'once', 'interval'];
const STATUSES = ['pending', 'approved', 'denied'];
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const entries = v => (Array.isArray(v) ? v.map((x, i) => [String(i), x]) : isObj(v) ? Object.entries(v) : []);
const num = v => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
const clone = v => JSON.parse(JSON.stringify(v));

// Pure. Returns { ok:true, clean, summary } or { ok:false, error }.
// `current` is the live members map: its pinHash values are kept, the file's are never used.
export function validateBackup(raw, current = state.members) {
  let b = raw;
  if (typeof raw === 'string') { try { b = JSON.parse(raw); } catch (e) { return { ok: false, error: 'That file is not valid JSON' }; } }
  if (!isObj(b)) return { ok: false, error: 'That file is not a FamilyFlow backup' };
  if (b.schemaVersion !== BACKUP_SCHEMA_VERSION) return { ok: false, error: 'Unsupported backup version: ' + String(b.schemaVersion) };
  if (!isObj(b.members) || (b.tasks !== undefined && !isObj(b.tasks))) return { ok: false, error: 'Backup is missing members or chores' };
  let skipped = 0;

  const members = {};
  for (const [key, m0] of entries(b.members)) {
    if (!isObj(m0)) { skipped++; continue; }
    const name = String(m0.name || key).trim();
    if (!name || validateMemberName(name)) { skipped++; continue; }
    const { pinHash, ...m } = m0; // eslint-disable-line no-unused-vars
    members[name] = {
      ...clone(m), name, role: m.role === 'admin' ? 'admin' : 'member',
      points: num(m.points), weekPoints: num(m.weekPoints), streak: num(m.streak), completedCount: num(m.completedCount),
      pinHash: (current && current[name] && current[name].pinHash) || '',
    };
  }
  const names = Object.keys(members);
  if (!names.length) return { ok: false, error: 'Backup has no valid members' };
  if (!names.some(n => members[n].role === 'admin')) return { ok: false, error: 'Backup has no admin member' };

  const tasks = {};
  for (const [key, t] of entries(b.tasks || {})) {
    const id = isObj(t) ? String(t.id || key) : '';
    const name = isObj(t) ? String(t.name || '').trim().slice(0, 60) : '';
    if (!ID_RE.test(id) || !name || !FREQS.includes(t.freq)) { skipped++; continue; }
    tasks[id] = { ...clone(t), id, name };
  }

  const history = (Array.isArray(b.history) ? b.history : []).filter(e => isObj(e) && Number.isFinite(Number(e.completedAt)))
    .slice(0, HISTORY_CAP).map(clone);

  const rewards = {};
  for (const [key, r] of entries(b.rewards || {})) {
    const id = isObj(r) ? String(r.id || key) : '';
    const v = isObj(r) && ID_RE.test(id) ? validateReward(r.name, r.cost, r.icon) : { error: 1 };
    if (v.error || Object.keys(rewards).length >= MAX_REWARDS) { skipped++; continue; }
    rewards[id] = { ...clone(r), id, ...v.reward };
  }

  const redemptions = {};
  entries(b.redemptions || {}).map(([k, r]) => [k, r])
    .filter(([k, r]) => isObj(r) && ID_RE.test(String(r.id || k)) && r.member && STATUSES.includes(r.status))
    .sort((a, c) => (c[1].requestedAt || 0) - (a[1].requestedAt || 0)).slice(0, MAX_REDEMPTIONS)
    .forEach(([k, r]) => { const id = String(r.id || k); redemptions[id] = { ...clone(r), id }; });

  const templates = {};
  for (const [key, t] of entries(b.templates || {})) {
    const id = isObj(t) ? String(t.id || key) : '';
    const name = isObj(t) ? String(t.name || '').trim().slice(0, 40) : '';
    if (!ID_RE.test(id) || !name || Object.keys(templates).length >= MAX_TEMPLATES) { skipped++; continue; }
    const list = (Array.isArray(t.tasks) ? t.tasks : []).filter(x => isObj(x) && String(x.name || '').trim() && FREQS.includes(x.freq)).slice(0, MAX_TEMPLATE_TASKS);
    templates[id] = { ...clone(t), id, name, tasks: clone(list) };
  }

  const nextId = Math.max(1, Math.floor(num(b.nextId)));
  return {
    ok: true, clean: { members, tasks, history, templates, rewards, redemptions, nextId },
    summary: { members: names.length, chores: Object.keys(tasks).length, history: history.length, exportedAt: String(b.exportedAt || ''), skipped },
  };
}

// Pure: the single multi-path update. Empty collections are null (Firebase drops them anyway).
// nextId never goes backwards, so ids already handed out are not reused.
export function restorePayload(clean, currentNextId = 1) {
  const orNull = o => (Object.keys(o).length ? o : null);
  return {
    members: clean.members, tasks: orNull(clean.tasks), history: clean.history.length ? clean.history : null,
    templates: orNull(clean.templates), rewards: orNull(clean.rewards), redemptions: orNull(clean.redemptions),
    nextId: Math.max(clean.nextId, Number(currentNextId) || 1),
  };
}

let _pending = null;

export function summaryHTML(s) {
  const when = s.exportedAt && !isNaN(Date.parse(s.exportedAt)) ? new Date(s.exportedAt).toLocaleString() : 'unknown date';
  return '<p>Exported <b>' + esc(when) + '</b></p><ul><li>' + s.members + ' members</li><li>' + s.chores + ' chores</li><li>' +
    s.history + ' history entries</li>' + (s.skipped ? '<li>' + s.skipped + ' invalid items will be skipped</li>' : '') + '</ul>';
}

export async function prepareRestore(file, isAdminFn) {
  if (READONLY || !isAdminFn() || !file) return false;
  let text;
  try { text = await file.text(); } catch (e) { showToast('Could not read that file'); return false; }
  const res = validateBackup(text);
  if (!res.ok) { showToast(res.error); _pending = null; return false; }
  _pending = res;
  document.getElementById('restore-summary').innerHTML = summaryHTML(res.summary);
  const inp = document.getElementById('restore-confirm'); inp.value = '';
  document.getElementById('restore-go').disabled = true;
  openModal('restore-modal');
  return true;
}

export function onRestoreInput(value) {
  const go = document.getElementById('restore-go');
  if (go) go.disabled = String(value).trim() !== CONFIRM_WORD || !_pending;
}

export function cancelRestore() { _pending = null; closeModal('restore-modal'); }

export async function confirmRestore(typed, isAdminFn) {
  if (READONLY || !isAdminFn() || !_pending) return false;
  if (String(typed).trim() !== CONFIRM_WORD) { showToast('Type ' + CONFIRM_WORD + ' to confirm'); return false; }
  if (!downloadBackup(isAdminFn)) { showToast('Safety backup failed: restore cancelled'); return false; }
  try {
    await patchRoot(restorePayload(_pending.clean, state.nextId));
    showToast('Backup restored');
    _pending = null; closeModal('restore-modal');
    return true;
  } catch (err) { showToast('Restore failed: ' + (err.code || err.message)); return false; }
}

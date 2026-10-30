// Download / upload the chore list as a JSON file (#234). Definitions only: no assignees,
// done state, points, history or members. The file never leaves the device.
import { state } from './state.js';
import { READONLY, CATEGORIES } from './config.js';
import { patchPaths } from './firebase.js';
import { showToast } from './ui.js';
import { openModal, closeModal } from './modals.js';
import { makeTask } from './starter.js';
import { esc, localDateStr, validInterval, validTime } from './utils.js';

export const CHORE_FILE_KIND = 'familyflow-chores';
export const MAX_CHORES = 200, MAX_FILE_BYTES = 200 * 1024;
const MAX_NAME = 100, MAX_NOTES = 300, MAX_SUBTASKS = 20, MAX_SUB_NAME = 60;
const FREQS = ['daily', 'weekdays', 'weekly', 'fortnightly', 'monthly', 'once', 'interval'];
const DIFFS = ['easy', 'medium', 'hard'];
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const key = n => String(n).trim().toLowerCase();
const existingNames = () => new Set(Object.values(state.tasks || {}).map(t => key(t.name)));

// Pure: the file contents for a task map.
export function buildChoreFile(tasks = state.tasks, now = new Date()) {
  const chores = Object.values(tasks || {}).sort((a, b) => (a.order || 0) - (b.order || 0)).map(t => {
    const subs = Object.values(t.subtasks || {}).map(s => String(s.name)).filter(Boolean);
    return {
      name: t.name, freq: t.freq, difficulty: t.difficulty || 'easy', category: t.category || '', notes: t.notes || '',
      ...(t.freq === 'weekdays' ? { days: (t.days || []).map(Number) } : {}),
      ...(t.freq === 'interval' ? { intervalDays: t.intervalDays } : {}),
      ...(t.freq === 'once' && t.dueDate ? { dueDate: t.dueDate } : {}),
      ...(t.dueTime ? { dueTime: t.dueTime } : {}),
      ...(subs.length ? { subtasks: subs } : {}),
    };
  });
  return { kind: CHORE_FILE_KIND, schemaVersion: 1, exportedAt: now.toISOString(), chores };
}

export const choreFilename = (now = new Date()) => 'familyflow-chores-' + localDateStr(now) + '.json';

// Admin-only. Local state only: no Firebase read or write.
export function downloadChores(isAdminFn) {
  if (READONLY || !isAdminFn()) return false;
  try {
    const now = new Date();
    const url = URL.createObjectURL(new Blob([JSON.stringify(buildChoreFile(state.tasks, now), null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = choreFilename(now);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Chores downloaded');
    return true;
  } catch (e) { showToast('Download failed'); return false; }
}

// '' when valid, otherwise the reason; `out` receives the cleaned chore.
function checkChore(c, out) {
  if (!isObj(c)) return 'Not a chore';
  const name = typeof c.name === 'string' ? c.name.trim() : '';
  if (!name || name.length > MAX_NAME) return 'Name must be 1-' + MAX_NAME + ' characters';
  if (!FREQS.includes(c.freq)) return 'Unknown frequency';
  const difficulty = c.difficulty === undefined ? 'easy' : c.difficulty;
  if (!DIFFS.includes(difficulty)) return 'Unknown difficulty';
  const notes = c.notes === undefined ? '' : c.notes;
  if (typeof notes !== 'string' || notes.length > MAX_NOTES) return 'Notes must be ' + MAX_NOTES + ' characters or fewer';
  Object.assign(out, { name, freq: c.freq, difficulty, category: CATEGORIES.includes(c.category) ? c.category : '', notes });
  if (c.freq === 'weekdays') {
    const days = Array.isArray(c.days) ? [...new Set(c.days)] : [];
    if (!days.length || !days.every(d => Number.isInteger(d) && d >= 0 && d <= 6)) return 'Pick days 0-6';
    out.days = days;
  }
  if (c.freq === 'interval') { if (!validInterval(c.intervalDays)) return 'Interval must be a whole number of days from 2 to 60'; out.intervalDays = c.intervalDays; }
  if (c.freq === 'once' && c.dueDate) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(c.dueDate))) return 'Due date must be YYYY-MM-DD'; out.dueDate = c.dueDate; }
  if (c.dueTime) { if (!validTime(c.dueTime)) return 'Due time must be HH:MM'; out.dueTime = c.dueTime; }
  const subs = c.subtasks === undefined ? [] : c.subtasks;
  if (!Array.isArray(subs) || subs.length > MAX_SUBTASKS || !subs.every(s => typeof s === 'string' && s.trim() && s.trim().length <= MAX_SUB_NAME)) return 'Up to ' + MAX_SUBTASKS + ' sub-tasks of 1-' + MAX_SUB_NAME + ' characters';
  out.subtasks = subs.map(s => s.trim());
  return '';
}

// Pure. { ok:true, chores (new, valid), invalid:[{index,name,reason}], dupes } or { ok:false, error }.
export function validateChoreFile(raw, existing = state.tasks) {
  let b = raw;
  if (typeof raw === 'string') {
    if (raw.length > MAX_FILE_BYTES) return { ok: false, error: 'That file is too large (max 200 KB)' };
    try { b = JSON.parse(raw); } catch (e) { return { ok: false, error: 'That file is not valid JSON' }; }
  }
  if (!isObj(b) || b.kind !== CHORE_FILE_KIND || !Array.isArray(b.chores)) return { ok: false, error: 'That file is not a FamilyFlow chore list' };
  if (b.chores.length > MAX_CHORES) return { ok: false, error: 'Too many chores in the file (max ' + MAX_CHORES + ')' };
  const seen = new Set(Object.values(existing || {}).map(t => key(t.name)));
  const chores = [], invalid = [];
  let dupes = 0;
  b.chores.forEach((c, i) => {
    const out = {}, reason = checkChore(c, out);
    if (reason) { invalid.push({ index: i + 1, name: isObj(c) && typeof c.name === 'string' ? c.name.slice(0, 40) : '', reason }); return; }
    if (seen.has(key(out.name))) { dupes++; return; }
    seen.add(key(out.name)); chores.push(out);
  });
  return { ok: true, chores, invalid, dupes };
}

// Pure: one multi-path update that only adds new tasks/<id> entries and moves nextId on.
export function addPayload(chores, nextId, base = Date.now()) {
  const paths = {};
  chores.forEach((c, n) => { const t = makeTask(c, 't' + (base + n), base, n); paths['tasks/' + t.id] = t; });
  paths.nextId = Math.max(Number(nextId) || 1, 1) + chores.length;
  return { paths };
}

let _pending = null;

function summaryHTML(r) {
  let h = '<p><b>' + r.chores.length + ' new</b>, ' + r.dupes + ' already exist (skipped)' + (r.invalid.length ? ', ' + r.invalid.length + ' invalid (skipped)' : '') + '</p>';
  if (r.chores.length) h += '<ul>' + r.chores.slice(0, 8).map(c => '<li>' + esc(c.name) + '</li>').join('') + (r.chores.length > 8 ? '<li>…and ' + (r.chores.length - 8) + ' more</li>' : '') + '</ul>';
  if (r.invalid.length) h += '<ul>' + r.invalid.slice(0, 8).map(i => '<li>#' + i.index + ' ' + esc(i.name) + ': ' + esc(i.reason) + '</li>').join('') + '</ul>';
  return h;
}

export async function prepareChoreUpload(file, isAdminFn) {
  if (READONLY || !isAdminFn() || !file) return false;
  if (file.size > MAX_FILE_BYTES) { showToast('That file is too large (max 200 KB)'); return false; }
  let text;
  try { text = await file.text(); } catch (e) { showToast('Could not read that file'); return false; }
  const res = validateChoreFile(text);
  if (!res.ok) { showToast(res.error); _pending = null; return false; }
  _pending = res;
  document.getElementById('chores-upload-summary').innerHTML = summaryHTML(res);
  document.getElementById('chores-upload-go').disabled = !res.chores.length;
  openModal('chores-upload-modal');
  return true;
}

export function cancelChoreUpload() { _pending = null; closeModal('chores-upload-modal'); }

// Adds the previewed chores as "Anyone", not done. Names that appeared since the preview are skipped again.
export async function confirmChoreUpload(isAdminFn) {
  if (READONLY || !isAdminFn() || !_pending) return 0;
  const have = existingNames(), chores = _pending.chores.filter(c => !have.has(key(c.name)));
  if (!chores.length) { showToast('Nothing new to add'); return 0; }
  const { paths } = addPayload(chores, state.nextId);
  try { await patchPaths(paths); } catch (err) { showToast('Save failed: ' + (err.code || err.message)); return 0; }
  Object.entries(paths).forEach(([k, v]) => { if (k === 'nextId') state.nextId = v; else state.tasks[v.id] = v; });
  cancelChoreUpload();
  showToast('Added ' + chores.length + ' chore' + (chores.length === 1 ? '' : 's'));
  return chores.length;
}

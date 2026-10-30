// Built-in starter chore list (#233). Static code, so a database wipe never removes it.
import { state } from './state.js';
import { READONLY, CATEGORIES } from './config.js';
import { patchPaths } from './firebase.js';
import { showToast } from './ui.js';
import { openModal, closeModal } from './modals.js';
import { esc, jsq, taskPoints, freqLabel, initialLastDone } from './utils.js';

const c = (name, freq, difficulty, category, extra = {}) => ({ name, freq, difficulty, category, ...extra });
export const STARTER = [
  c('Wash the dishes', 'daily', 'easy', 'Kitchen'), c('Wipe kitchen counters', 'daily', 'easy', 'Kitchen'),
  c('Empty the dishwasher', 'daily', 'easy', 'Kitchen'), c('Take out the kitchen rubbish', 'daily', 'easy', 'Kitchen'),
  c('Clean the fridge', 'monthly', 'medium', 'Kitchen'), c('Clean the oven', 'monthly', 'hard', 'Kitchen'),
  c('Clean the toilet', 'weekly', 'medium', 'Bathroom'), c('Clean the sink and mirror', 'weekly', 'easy', 'Bathroom'),
  c('Scrub the shower', 'weekly', 'hard', 'Bathroom'), c('Wash the bath mats', 'fortnightly', 'easy', 'Bathroom'),
  c('Make your bed', 'daily', 'easy', 'Bedroom'), c('Tidy your room', 'weekly', 'easy', 'Bedroom'),
  c('Change the bed sheets', 'fortnightly', 'medium', 'Bedroom'), c('Put away clean laundry', 'weekly', 'easy', 'Bedroom'),
  c('Wash and dry the laundry', 'weekly', 'medium', 'Bedroom'), c('Dust the bedrooms', 'fortnightly', 'easy', 'Bedroom'),
  c('Tidy the living room', 'daily', 'easy', 'Living Room'), c('Vacuum the floors', 'weekly', 'medium', 'Living Room'),
  c('Mop the floors', 'weekly', 'medium', 'Living Room'), c('Dust the shelves and surfaces', 'weekly', 'easy', 'Living Room'),
  c('Wipe the windows', 'monthly', 'medium', 'Living Room'), c('Water the plants', 'weekly', 'easy', 'Garden'),
  c('Mow the lawn', 'fortnightly', 'hard', 'Garden'), c('Weed the garden', 'monthly', 'medium', 'Garden'),
  c('Sweep the balcony', 'weekly', 'easy', 'Outdoor'), c('Wash the car', 'monthly', 'hard', 'Outdoor'),
  c('Take bins to the kerb', 'weekly', 'easy', 'Outdoor'), c('Feed the pets', 'daily', 'easy', 'Other'),
  c('Set the table', 'daily', 'easy', 'Other'), c('Sort the recycling', 'weekly', 'easy', 'Other'),
];

const key = n => String(n).trim().toLowerCase();

// One new chore from a definition ({ name, freq, difficulty, category } plus optional notes,
// days, intervalDays, dueDate, dueTime, subtasks[]). Shared with the chore-file upload (#234).
export function makeTask(s, id, base, n) {
  const subtasks = {};
  (s.subtasks || []).forEach((name, j) => { const sid = 's' + (base + n) + '_' + j; subtasks[sid] = { id: sid, name, done: false }; });
  return { id, name: s.name, freq: s.freq, person: '', done: false,
    lastDone: initialLastDone(s.freq === 'interval' ? { freq: s.freq, intervalDays: s.intervalDays } : s.freq, base),
    ...(s.freq === 'weekdays' ? { days: s.days } : {}), ...(s.freq === 'interval' ? { intervalDays: s.intervalDays } : {}),
    ...(s.dueTime ? { dueTime: s.dueTime } : {}),
    notes: s.notes || '', difficulty: s.difficulty, category: s.category, dueDate: s.dueDate || '', subtasks, order: base + n };
}
const existing = () => new Set(Object.values(state.tasks || {}).map(t => key(t.name)));

export function openStarter(isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  const have = existing();
  let html = '';
  CATEGORIES.forEach(cat => {
    const items = STARTER.filter(s => s.category === cat);
    if (!items.length) return;
    html += '<div class="tpl-section-label">' + esc(cat) + ' <button class="btn-sm" onclick="window.toggleStarterCat(\'' + jsq(cat) + '\')">Select all</button></div>';
    items.forEach(s => {
      const dup = have.has(key(s.name));
      html += '<label class="starter-item"><input type="checkbox" data-cat="' + esc(cat) + '" value="' + esc(s.name) + '"' + (dup ? ' checked disabled' : '') + ' />' +
        '<span class="starter-name">' + esc(s.name) + '</span><span class="starter-meta">' + (dup ? 'already added' : esc(freqLabel(s)) + ' · ' + taskPoints(s) + ' pts') + '</span></label>';
    });
  });
  document.getElementById('starter-list').innerHTML = html;
  openModal('starter-modal');
}

export function closeStarter() { closeModal('starter-modal'); }

export function toggleStarterCat(cat) {
  const boxes = [...document.querySelectorAll('#starter-list input[type=checkbox]:not(:disabled)')].filter(i => i.dataset.cat === cat);
  const all = boxes.every(i => i.checked);
  boxes.forEach(i => { i.checked = !all; });
}

// Adds the named starter chores in one multi-path update. Skips names that already exist.
export async function addStarterChores(names, isAdminFn) {
  if (READONLY || !isAdminFn()) return 0;
  const want = new Set((names || []).map(key)), have = existing(), base = Date.now(), paths = {};
  let n = 0;
  STARTER.forEach(s => {
    if (!want.has(key(s.name)) || have.has(key(s.name))) return;
    const t = makeTask(s, 't' + (base + n), base, n);
    state.tasks[t.id] = t;
    paths['tasks/' + t.id] = t;
    n++;
  });
  if (!n) { showToast('Nothing new to add'); return 0; }
  state.nextId += n; paths.nextId = state.nextId;
  try { await patchPaths(paths); } catch (err) { showToast('Save failed: ' + (err.code || err.message)); return 0; }
  closeStarter();
  showToast('Added ' + n + ' chore' + (n === 1 ? '' : 's'));
  return n;
}

export function addSelectedStarter(isAdminFn) {
  const names = [...document.querySelectorAll('#starter-list input:checked:not(:disabled)')].map(i => i.value);
  return addStarterChores(names, isAdminFn);
}

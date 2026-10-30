import { state, getMembers, memberColor } from './state.js';
import { PCOLS, BADGES, CATEGORIES, READONLY } from './config.js';
import { openModal, closeModal } from './modals.js';
import { writeBlocked } from './writegate.js';
import { patchPaths } from './firebase.js';
import { esc, jsq, avatarPrefix, sha256, initialLastDone, validInterval, validTime, dueStatus, localDateStr, currentStreak, currentWeekPoints, weekRecap, lastWeekChampion } from './utils.js';
import { cycleTheme, initTheme } from './theme.js';
import { isAdmin } from './auth.js';

// ── pColor helper ─────────────────────────────────────────────────────────────

export function pColor(name) { return memberColor(name); }

// ── Toast ─────────────────────────────────────────────────────────────────────

// Status messages stay long enough to read (WCAG 2.2.1): >= 5 s, ~60 ms per character, max 10 s.
export function toastDuration(msg) {
  return Math.min(10000, Math.max(5000, String(msg || '').length * 60));
}

export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg || 'Saved';
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), toastDuration(t.textContent));
}

// ── Theme ─────────────────────────────────────────────────────────────────────

// Cycles Auto -> Light -> Dark (logic lives in theme.js).
export function toggleTheme() { return cycleTheme(); }

export function syncThemeButton() { initTheme(); }

// ── Leaderboard ───────────────────────────────────────────────────────────────

let lbTab = 'alltime';

export function openLeaderboard() {
  renderLeaderboard();
  openModal('leaderboard-modal');
}

export function setLbTab(tab, btn) {
  lbTab = tab;
  document.querySelectorAll('#leaderboard-modal .lb-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#leaderboard-modal .lb-tab').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  renderLeaderboard();
}

// "Last week" tab: rows come from history (no new stored data). Ties share a rank.
export function lastWeekHTML() {
  const { weekStart, rows, truncated } = lastWeekChampion(state.history);
  if (!rows.length) return '<div class="empty">No chores were completed last week.</div>';
  let rank = 0, prev = null;
  const html = rows.map((r, i) => {
    if (r.points !== prev) rank = i + 1;
    prev = r.points;
    const m = state.members[r.name] || { name: r.name };
    const c = pColor(r.name) || { bg: '#EEE', text: '#333' };
    return '<div class="lb-row"><span class="lb-rank">' + rank + '</span>' +
      '<span class="lb-name" style="background:' + c.bg + ';color:' + c.text + ';">' + esc(avatarPrefix(m)) + esc(r.name) + '</span>' +
      '<span class="lb-pts">' + r.points + ' pts</span>' +
      '<span class="lb-streak">' + r.count + ' done</span></div>';
  }).join('');
  return '<div class="lb-note">Week of ' + esc(weekStart) + '</div>' + html +
    (truncated ? '<div class="lb-note" role="note">Activity history is capped, so this week may be incomplete.</div>' : '');
}

function renderLeaderboard() {
  document.getElementById('lb-list').innerHTML = leaderboardHTML(lbTab);
}

// Rows for a leaderboard tab ('alltime' | 'week' | 'lastweek'); also used by the TV cycle (#148).
export function leaderboardHTML(tab) {
  if (tab === 'lastweek') return lastWeekHTML();
  const sorted = Object.values(state.members).slice().sort((a, b) => {
    const va = tab === 'week' ? currentWeekPoints(a) : (a.points || 0);
    const vb = tab === 'week' ? currentWeekPoints(b) : (b.points || 0);
    return vb - va || String(a.name).localeCompare(String(b.name)); // ties: stable, by name (#170)
  });
  let rank = 0, prevPts = null;
  return sorted.map((m, i) => {
    const c = pColor(m.name) || { bg: '#EEE', text: '#333' };
    const streak = currentStreak(m);
    const pts = tab === 'week' ? currentWeekPoints(m) : (m.points || 0);
    if (pts !== prevPts) rank = i + 1; // equal points share a rank: 1, 1, 3
    prevPts = pts;
    const badgeIcons = (m.badges || []).map(id => {
      const b = BADGES.find(b => b.id === id); return b ? b.icon : '';
    }).join('');
    return '<div class="lb-row">' +
      '<span class="lb-rank">' + rank + '</span>' +
      '<span class="lb-name" style="background:' + c.bg + ';color:' + c.text + ';">' + esc(avatarPrefix(m)) + esc(m.name) + '</span>' +
      '<span class="lb-pts">' + pts + ' pts</span>' +
      (streak > 0 ? '<span class="lb-streak">🔥 ' + streak + '</span>' : '') +
      (badgeIcons ? '<span class="lb-badges">' + badgeIcons + '</span>' : '') +
      '</div>';
  }).join('') || '<div class="empty">No members yet.</div>';
}

// ── Stats ─────────────────────────────────────────────────────────────────────

let statsTab = 'week';

export function openStats() {
  renderStats();
  openModal('stats-modal');
}

export function setStatsTab(tab, btn) {
  statsTab = tab;
  document.querySelectorAll('#stats-modal .lb-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#stats-modal .lb-tab').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  renderStats();
}

function getStatsFromTs() {
  if (statsTab === 'week') {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  } else if (statsTab === 'month') {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return 0;
}

function renderStats() {
  const from = getStatsFromTs();
  const history = (state.history || []).filter(e => e.completedAt >= from);
  const counts = {};
  history.forEach(e => { if (e.person && e.type !== 'bonus') counts[e.person] = (counts[e.person] || 0) + 1; });
  const max = Math.max(1, ...Object.values(counts).concat([0]));
  const el = document.getElementById('stats-chart');
  const members = getMembers();
  if (!members.length) { el.innerHTML = '<div class="empty">No members yet.</div>'; return; }
  el.innerHTML = members.map((m, i) => {
    const c = pColor(m) || PCOLS[0];
    const count = counts[m] || 0;
    const pct = Math.round(count / max * 100);
    return '<div class="stats-row">' +
      '<span class="lb-name" style="background:' + c.bg + ';color:' + c.text +
        ';min-width:80px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0;">' + esc(m) + '</span>' +
      '<div class="stats-bar-wrap"><div class="stats-bar" style="width:' + pct + '%"></div></div>' +
      '<span class="stats-count">' + count + '</span>' +
      '</div>';
  }).join('');
}

// Neutralise spreadsheet formulas (CSV injection) and quote fields that need it.
export function csvField(v) {
  let s = String(v);
  if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function exportCSV(from, to) {
  const fromTs = from ? new Date(from + 'T00:00:00').getTime() : 0;
  const toTs   = to   ? new Date(to + 'T00:00:00').getTime() + 86399999 : Date.now();
  const rows = (state.history || []).filter(e => e.completedAt >= fromTs && e.completedAt <= toTs);
  let csv = 'date,time,person,task,frequency,difficulty,points\n';
  rows.forEach(e => {
    const task = state.tasks[e.taskId];
    const d = new Date(e.completedAt);
    csv += [
      csvField(localDateStr(d)),
      csvField(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')),
      csvField(e.person || ''),
      csvField(e.type === 'bonus' ? 'Bonus: ' + (e.reason || '') : (e.taskName || '')),
      csvField(task ? (task.freq || '') : ''),
      csvField(task ? (task.difficulty || 'easy') : ''),
      csvField(e.points || 0),
    ].join(',') + '\n';
  });
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'chores-export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function openTemplates() {
  renderTemplates();
  openModal('templates-modal');
}

export const MAX_TEMPLATES = 20;
export const MAX_TEMPLATE_TASKS = 100;
// Firebase drops empty arrays, so a stored template may have no `tasks` key.
const tplTasks = tpl => (tpl && Array.isArray(tpl.tasks) ? tpl.tasks : []);

function renderTemplates() {
  const tmpls = Object.values(state.templates || {});
  document.getElementById('tpl-list').innerHTML = tmpls.length
    ? tmpls.map(tpl =>
        '<div class="tpl-item">' +
          '<div class="tpl-item-info">' +
            '<div class="tpl-item-name">' + esc(tpl.name) + '</div>' +
            '<div class="tpl-item-count">' + tplTasks(tpl).length + ' task' + (tplTasks(tpl).length !== 1 ? 's' : '') + '</div>' +
          '</div>' +
          '<button class="btn-sm btn-accent" onclick="window.applyTemplate(\'' + jsq(tpl.id) + '\')">Apply</button>' +
          '<button class="btn-sm" onclick="window.deleteTemplate(\'' + jsq(tpl.id) + '\')">Delete</button>' +
        '</div>'
      ).join('')
    : '<div class="empty">No templates saved yet.</div>';
}

// Template entry for one chore (#139): keeps category, notes, due time and subtask names
// (never done state, assignee, points or history). Empty fields are omitted.
const MAX_TPL_SUBTASKS = 20;
export function templateTask(t) {
  const subs = Object.values(t.subtasks || {}).map(s => String((s && s.name) || '').trim().slice(0, 100)).filter(Boolean).slice(0, MAX_TPL_SUBTASKS);
  return {
    name: t.name, freq: t.freq, difficulty: t.difficulty || 'easy',
    ...(t.freq === 'weekdays' ? { days: t.days || [] } : {}),
    ...(t.freq === 'interval' ? { intervalDays: validInterval(t.intervalDays) || 7 } : {}),
    ...(CATEGORIES.includes(t.category) && t.category ? { category: t.category } : {}),
    ...(t.notes ? { notes: String(t.notes).slice(0, 300) } : {}),
    ...(validTime(t.dueTime) ? { dueTime: t.dueTime } : {}),
    ...(subs.length ? { subtasks: subs } : {}),
  };
}

export function saveTemplate() {
  if (READONLY || !isAdmin()) return;
  if (writeBlocked(showToast)) return;
  const input = document.getElementById('tpl-name-input');
  const name = input.value.trim();
  if (!name) { showToast('Enter a template name'); return; }
  const chores = Object.values(state.tasks || {});
  if (!chores.length) { showToast('Add some chores before saving a template'); return; }
  if (chores.length > MAX_TEMPLATE_TASKS) { showToast('Too many chores for one template (max ' + MAX_TEMPLATE_TASKS + ')'); return; }
  if (!state.templates) state.templates = {};
  if (Object.keys(state.templates).length >= MAX_TEMPLATES) { showToast('Template limit reached (' + MAX_TEMPLATES + ')'); return; }
  const id = 'tpl' + Date.now();
  const tpl = {
    id, name,
    tasks: chores.map(templateTask),
  };
  state.templates[id] = tpl;
  input.value = '';
  patchPaths({ ['templates/' + id]: tpl }).catch(err => showToast('Save failed: ' + (err.code || err.message)));
  showToast('Template saved');
  renderTemplates();
}

export function applyTemplate(id) {
  if (READONLY || !isAdmin()) return;
  if (writeBlocked(showToast)) return;
  const tpl = (state.templates || {})[id];
  if (!tpl) return;
  let added = 0;
  const paths = {};
  tplTasks(tpl).forEach(t => {
    const now = Date.now();
    const taskId = 't' + now + Math.random().toString(36).slice(2);
    state.tasks[taskId] = {
      id: taskId, name: t.name, freq: t.freq, difficulty: t.difficulty || 'easy',
      ...(t.freq === 'weekdays' ? { days: t.days || [] } : {}),
      ...(t.freq === 'interval' ? { intervalDays: validInterval(t.intervalDays) || 7 } : {}),
      done: false, lastDone: initialLastDone(t),
      person: '', order: Date.now() + added,
      // Fields below are absent on legacy templates (#139)
      category: CATEGORIES.includes(t.category) ? t.category : '', notes: String(t.notes || '').slice(0, 300),
      dueDate: t.freq === 'once' ? localDateStr() : '', ...(validTime(t.dueTime) ? { dueTime: t.dueTime } : {}),
      subtasks: Object.fromEntries((Array.isArray(t.subtasks) ? t.subtasks : []).slice(0, MAX_TPL_SUBTASKS).map((n, i) =>
        ['s' + now + i, { id: 's' + now + i, name: String(n).slice(0, 100), done: false }])),
    };
    paths['tasks/' + taskId] = state.tasks[taskId];
    state.nextId++;
    added++;
  });
  if (added) paths.nextId = state.nextId;
  patchPaths(paths).catch(err => showToast('Save failed: ' + (err.code || err.message)));
  showToast(added + ' task' + (added !== 1 ? 's' : '') + ' added from template');
  renderTemplates();
}

export function deleteTemplate(id) {
  if (READONLY || !isAdmin()) return;
  if (!confirm('Delete this template?')) return;
  delete state.templates[id];
  patchPaths({ ['templates/' + id]: null }).catch(err => showToast('Save failed: ' + (err.code || err.message)));
  renderTemplates();
}

// ── Daily Summary ─────────────────────────────────────────────────────────────

export function maybeShowDailySummary() {
  const today = localDateStr();
  try {
    if (localStorage.getItem('fc_summary_date') === today) return;
    localStorage.setItem('fc_summary_date', today);
  } catch(e) { return; }
  renderSummaryModal();
  openModal('summary-modal');
}

function renderSummaryModal() {
  let me = '';
  try { me = sessionStorage.getItem('fc_member') || ''; } catch(e) {}
  let tasks = Object.values(state.tasks).filter(t =>
    !t.done && (dueStatus(t) === 'overdue' || dueStatus(t) === 'soon')
  );
  if (me) tasks = tasks.filter(t => t.person === me || !t.person);
  let body = '';
  if (tasks.length === 0) {
    body = '<div class="empty" style="text-align:center;padding:2rem 0;">You\'re all clear today! 🎉</div>';
  } else {
    body = '<ul style="list-style:none;padding:0;">' +
      tasks.map(t => {
        const s = dueStatus(t);
        const pc = t.person ? pColor(t.person) : null;
        const personBit = t.person && pc
          ? ' <span class="tag" style="background:' + pc.bg + ';color:' + pc.text + ';">' + esc(t.person) + '</span>'
          : '';
        const statusBit = s === 'overdue'
          ? '<span class="tag tag-overdue">Overdue</span>'
          : '<span class="tag tag-soon">Due soon</span>';
        return '<li style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border);">' +
          '<span style="flex:1;font-size:0.95rem;">' + esc(t.name) + '</span>' +
          statusBit + personBit + '</li>';
      }).join('') + '</ul>';
  }
  document.getElementById('summary-body').innerHTML = body;
}

export function closeSummary() { closeModal('summary-modal'); }

export function summaryLetsGo() {
  closeModal('summary-modal');
  window.dispatchEvent(new CustomEvent('fc:setfilter', { detail: 'pending' }));
}

// ── Set-PIN modal (admin) ─────────────────────────────────────────────────────

let _setPinTarget = '';
let _setPinBuffer = '';

export function openSetPin(name) {
  _setPinTarget = name;
  _setPinBuffer = '';
  document.getElementById('setpin-title').textContent = 'Set PIN — ' + name;
  document.getElementById('setpin-error').textContent = '';
  document.querySelectorAll('#setpin-dots .pin-dot').forEach(d => d.classList.remove('filled', 'error'));
  openModal('setpin-modal');
}

export function closeSetPin() {
  closeModal('setpin-modal');
  _setPinBuffer = '';
  _setPinTarget = '';
}

export async function setPinKey(digit) {
  if (READONLY || !isAdmin()) return;
  if (_setPinBuffer.length >= 4) return;
  _setPinBuffer += digit;
  document.querySelectorAll('#setpin-dots .pin-dot').forEach((d, i) => {
    d.classList.toggle('filled', i < _setPinBuffer.length);
  });
  if (_setPinBuffer.length === 4) {
    const target = _setPinTarget; // capture: closeSetPin() clears it
    const hash = await sha256(_setPinBuffer);
    _setPinBuffer = '';
    document.querySelectorAll('#setpin-dots .pin-dot').forEach(d => d.classList.remove('filled'));
    if (writeBlocked(showToast)) return;
    if (!target || !state.members[target]) {
      document.getElementById('setpin-error').textContent = 'Member not found';
      return;
    }
    const { patchMember } = await import('./firebase.js');
    try {
      await patchMember(target, { pinHash: hash });
      closeSetPin();
      showToast('PIN saved for ' + target);
    } catch (err) {
      document.getElementById('setpin-error').textContent = 'Save failed: ' + (err.code || err.message);
    }
  }
}

export function setPinDel() {
  _setPinBuffer = _setPinBuffer.slice(0, -1);
  document.querySelectorAll('#setpin-dots .pin-dot').forEach((d, i) => {
    d.classList.toggle('filled', i < _setPinBuffer.length);
  });
}

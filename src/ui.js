import { state, getMembers } from './state.js';
import { PCOLS, BADGES, READONLY } from './config.js';
import { openModal, closeModal } from './modals.js';
import { writeState } from './firebase.js';
import { esc, sha256, freqDays, dueStatus } from './utils.js';
import { isAdmin } from './auth.js';

// ── pColor helper ─────────────────────────────────────────────────────────────

export function pColor(name) {
  const members = getMembers();
  const i = members.indexOf(name);
  return i >= 0 ? PCOLS[i % PCOLS.length] : null;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg || 'Saved';
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 1800);
}

// ── Theme ─────────────────────────────────────────────────────────────────────

export function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  if (isDark) {
    html.removeAttribute('data-theme');
    document.getElementById('theme-btn').textContent = '🌙';
    try { localStorage.setItem('fc_theme', 'light'); } catch(e) {}
  } else {
    html.setAttribute('data-theme', 'dark');
    document.getElementById('theme-btn').textContent = '☀️';
    try { localStorage.setItem('fc_theme', 'dark'); } catch(e) {}
  }
}

export function syncThemeButton() {
  const btn = document.getElementById('theme-btn');
  if (btn && document.documentElement.getAttribute('data-theme') === 'dark') {
    btn.textContent = '☀️';
  }
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

let lbTab = 'alltime';

export function openLeaderboard() {
  renderLeaderboard();
  openModal('leaderboard-modal');
}

export function setLbTab(tab, btn) {
  lbTab = tab;
  document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLeaderboard();
}

function renderLeaderboard() {
  const sorted = Object.values(state.members).slice().sort((a, b) => {
    const va = lbTab === 'week' ? (a.weekPoints || 0) : (a.points || 0);
    const vb = lbTab === 'week' ? (b.weekPoints || 0) : (b.points || 0);
    return vb - va;
  });
  document.getElementById('lb-list').innerHTML = sorted.map((m, i) => {
    const c = pColor(m.name) || { bg: '#EEE', text: '#333' };
    const streak = m.streak || 0;
    const pts = lbTab === 'week' ? (m.weekPoints || 0) : (m.points || 0);
    const badgeIcons = (m.badges || []).map(id => {
      const b = BADGES.find(b => b.id === id); return b ? b.icon : '';
    }).join('');
    return '<div class="lb-row">' +
      '<span class="lb-rank">' + (i + 1) + '</span>' +
      '<span class="lb-name" style="background:' + c.bg + ';color:' + c.text + ';">' + esc(m.name) + '</span>' +
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
  history.forEach(e => { if (e.person) counts[e.person] = (counts[e.person] || 0) + 1; });
  const max = Math.max(1, ...Object.values(counts).concat([0]));
  const el = document.getElementById('stats-chart');
  const members = getMembers();
  if (!members.length) { el.innerHTML = '<div class="empty">No members yet.</div>'; return; }
  el.innerHTML = members.map((m, i) => {
    const c = PCOLS[i % PCOLS.length];
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

export function exportCSV(from, to) {
  const fromTs = from ? new Date(from).getTime() : 0;
  const toTs   = to   ? new Date(to).getTime() + 86399999 : Date.now();
  const rows = (state.history || []).filter(e => e.completedAt >= fromTs && e.completedAt <= toTs);
  function csvField(s) {
    s = String(s);
    return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  let csv = 'date,person,task,frequency,difficulty,points\n';
  rows.forEach(e => {
    const task = state.tasks[e.taskId];
    csv += [
      csvField(new Date(e.completedAt).toLocaleDateString()),
      csvField(e.person || ''),
      csvField(e.taskName || ''),
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

function renderTemplates() {
  const tmpls = Object.values(state.templates || {});
  document.getElementById('tpl-list').innerHTML = tmpls.length
    ? tmpls.map(tpl =>
        '<div class="tpl-item">' +
          '<div class="tpl-item-info">' +
            '<div class="tpl-item-name">' + esc(tpl.name) + '</div>' +
            '<div class="tpl-item-count">' + tpl.tasks.length + ' task' + (tpl.tasks.length !== 1 ? 's' : '') + '</div>' +
          '</div>' +
          '<button class="btn-sm btn-accent" onclick="window.applyTemplate(\'' + tpl.id + '\')">Apply</button>' +
          '<button class="btn-sm" onclick="window.deleteTemplate(\'' + tpl.id + '\')">Delete</button>' +
        '</div>'
      ).join('')
    : '<div class="empty">No templates saved yet.</div>';
}

export function saveTemplate() {
  if (READONLY || !isAdmin()) return;
  const input = document.getElementById('tpl-name-input');
  const name = input.value.trim();
  if (!name) { showToast('Enter a template name'); return; }
  const id = 'tpl' + Date.now();
  state.templates[id] = {
    id, name,
    tasks: Object.values(state.tasks).map(t => ({ name: t.name, freq: t.freq, difficulty: t.difficulty || 'easy' })),
  };
  input.value = '';
  writeState().catch(err => showToast('Save failed: ' + (err.code || err.message)));
  showToast('Template saved');
  renderTemplates();
}

export function applyTemplate(id) {
  if (READONLY || !isAdmin()) return;
  const tpl = (state.templates || {})[id];
  if (!tpl) return;
  let added = 0;
  tpl.tasks.forEach(t => {
    const taskId = 't' + Date.now() + Math.random().toString(36).slice(2);
    state.tasks[taskId] = {
      id: taskId, name: t.name, freq: t.freq, difficulty: t.difficulty || 'easy',
      done: false, lastDone: Date.now() - freqDays(t.freq) * 86400000,
      person: '', order: Date.now() + added,
    };
    state.nextId++;
    added++;
  });
  writeState().catch(err => showToast('Save failed: ' + (err.code || err.message)));
  showToast(added + ' task' + (added !== 1 ? 's' : '') + ' added from template');
  renderTemplates();
}

export function deleteTemplate(id) {
  if (READONLY || !isAdmin()) return;
  if (!confirm('Delete this template?')) return;
  delete state.templates[id];
  writeState().catch(err => showToast('Save failed: ' + (err.code || err.message)));
  renderTemplates();
}

// ── Daily Summary ─────────────────────────────────────────────────────────────

export function maybeShowDailySummary() {
  const today = new Date().toISOString().slice(0, 10);
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
  if (_setPinBuffer.length >= 4) return;
  _setPinBuffer += digit;
  document.querySelectorAll('#setpin-dots .pin-dot').forEach((d, i) => {
    d.classList.toggle('filled', i < _setPinBuffer.length);
  });
  if (_setPinBuffer.length === 4) {
    const hash = await sha256(_setPinBuffer);
    _setPinBuffer = '';
    const { patchMember } = await import('./firebase.js');
    try {
      await patchMember(_setPinTarget, { pinHash: hash });
      closeSetPin();
      showToast('PIN saved for ' + _setPinTarget);
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

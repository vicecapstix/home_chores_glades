import { state, getMembers } from './state.js';
import { PCOLS, READONLY } from './config.js';
import { esc, sha256 } from './utils.js';

let _pendingMemberName = '';
let _memberPinBuffer   = '';

// ── Session helpers ────────────────────────────────────────────────────────────

export function currentMember() {
  try { return sessionStorage.getItem('fc_member') || ''; } catch(e) { return ''; }
}

export function isAdmin() {
  if (READONLY) return false;
  if (Object.keys(state.members).length === 0) return true; // setup mode
  const m = currentMember();
  return m ? (state.members[m]?.role === 'admin') : false;
}

// ── Login flow ────────────────────────────────────────────────────────────────

// Called once Firebase state first loads. Shows member selector or restores session.
export function handleFirstLoad(onLoginComplete) {
  const saved = currentMember();
  if (READONLY) {
    onLoginComplete();
    return;
  }
  if (saved && state.members[saved]) {
    // Session restored — skip selector
    document.getElementById('pin-screen').classList.add('hidden');
    onLoginComplete();
    return;
  }
  // Clear stale session
  try { sessionStorage.removeItem('fc_member'); } catch(e) {}
  const members = getMembers();
  if (members.length === 0) {
    completeLogin(null, onLoginComplete);
  } else {
    showMemberSelector(onLoginComplete);
  }
}

function completeLogin(name, onLoginComplete) {
  try { if (name) sessionStorage.setItem('fc_member', name); } catch(e) {}
  document.getElementById('pin-screen').classList.add('hidden');
  if (onLoginComplete) onLoginComplete();
}

export function showMemberSelector(onLoginComplete) {
  const members = getMembers();
  document.getElementById('pin-member-sub').textContent = 'Select your name to continue';
  document.getElementById('pin-member-name').textContent = '';
  document.getElementById('pin-member-pin').classList.add('hidden');
  document.getElementById('pin-member-chips').innerHTML = members.map((m, i) => {
    const c = PCOLS[i % PCOLS.length];
    return '<button class="pin-member-chip" style="background:' + c.bg + ';color:' + c.text + ';" ' +
      'onclick="window.memberSelect(\'' + esc(m) + '\')">' + esc(m) + '</button>';
  }).join('');
  // Store callback for after login
  window._fcLoginCallback = onLoginComplete;
}

function showMemberPinPad(name) {
  document.getElementById('pin-member-chips').innerHTML = '';
  document.getElementById('pin-member-name').textContent = name;
  document.getElementById('pin-member-sub').textContent = 'Enter your 4-digit PIN';
  document.getElementById('pin-member-error').textContent = '';
  document.getElementById('pin-member-pin').classList.remove('hidden');
  _memberPinBuffer = '';
  _updateMemberDots();
}

function _updateMemberDots() {
  document.querySelectorAll('#pin-member-dots .pin-dot').forEach((d, i) => {
    d.classList.toggle('filled', i < _memberPinBuffer.length);
    d.classList.remove('error');
  });
}

function _flashMemberError(msg) {
  document.querySelectorAll('#pin-member-dots .pin-dot').forEach(d => {
    d.classList.remove('filled'); d.classList.add('error');
  });
  document.getElementById('pin-member-error').textContent = msg;
  setTimeout(() => {
    document.querySelectorAll('#pin-member-dots .pin-dot').forEach(d => d.classList.remove('error'));
    _memberPinBuffer = '';
    _updateMemberDots();
  }, 700);
}

// ── Exposed window handlers ────────────────────────────────────────────────────

export function memberSelect(name) {
  const mem = state.members[name];
  if (!mem) { completeLogin(null, window._fcLoginCallback); return; }
  if (mem.pinHash) {
    _pendingMemberName = name;
    showMemberPinPad(name);
  } else {
    completeLogin(name, window._fcLoginCallback);
  }
}

export async function memberPinKey(digit) {
  if (_memberPinBuffer.length >= 4) return;
  _memberPinBuffer += digit;
  _updateMemberDots();
  if (_memberPinBuffer.length === 4) {
    const hash = await sha256(_memberPinBuffer);
    const expected = (state.members[_pendingMemberName] || {}).pinHash || '';
    _memberPinBuffer = '';
    if (hash === expected) {
      completeLogin(_pendingMemberName, window._fcLoginCallback);
    } else {
      _flashMemberError('Incorrect PIN');
    }
  }
}

export function memberPinDel() {
  _memberPinBuffer = _memberPinBuffer.slice(0, -1);
  _updateMemberDots();
}

export function memberPinBack() {
  _pendingMemberName = '';
  _memberPinBuffer = '';
  showMemberSelector(window._fcLoginCallback);
}

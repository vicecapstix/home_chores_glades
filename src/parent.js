// Parent email sign-in UI (#97). Kids keep tapping their name; parents sign in
// with email + password and, once their UID is in /admins, become admin.
import { state } from './state.js';
import { READONLY } from './config.js';
import { esc } from './utils.js';
import { parentSignIn, parentSignOut, describeParentSignInError } from './firebase.js';
import { showToast } from './ui.js';
import { adminsActive, parentMemberName, currentMember, loginAs } from './auth.js';

const el = id => document.getElementById(id);

export function showParentSignIn() {
  if (READONLY) return;
  el('pin-member-chips').classList.add('hidden');
  el('parent-signin-open').classList.add('hidden');
  el('parent-signin').classList.remove('hidden');
  el('pin-member-sub').textContent = 'Parent sign in';
  el('parent-signin-error').textContent = '';
  el('parent-email').focus();
}

export function hideParentSignIn() {
  el('parent-signin').classList.add('hidden');
  el('pin-member-chips').classList.remove('hidden');
  el('parent-signin-open').classList.remove('hidden');
  el('parent-password').value = '';
  el('pin-member-sub').textContent = 'Select your name to continue';
}

export async function submitParentSignIn() {
  if (READONLY) return;
  const email = el('parent-email').value;
  const password = el('parent-password').value;
  if (!email.trim() || !password) { el('parent-signin-error').textContent = 'Enter your email and password'; return; }
  const btn = el('parent-signin-submit');
  btn.disabled = true;
  const res = await parentSignIn(email, password);
  btn.disabled = false;
  el('parent-password').value = '';
  if (!res.ok) { el('parent-signin-error').textContent = describeParentSignInError(res.code); return; }
  hideParentSignIn();
  const name = parentMemberName();
  if (name && state.members[name]) {
    loginAs(name);
    showToast('Signed in as ' + name + ' (parent)');
  } else {
    showToast('Signed in. To make this account an admin, add /admins/' + res.uid + ' in Firebase Console.');
  }
}

export async function signOutParent() {
  if (!state.auth.isParent) return;
  const res = await parentSignOut();
  if (!res.ok) showToast('Sign out failed: ' + res.code);
}

// Called when /admins or the signed-in user changes: a parent whose UID is
// mapped to a member is logged in as that member if nobody is logged in yet.
export function syncParentSession() {
  if (READONLY || !state.auth.isParent) return;
  const name = parentMemberName();
  if (name && state.members[name] && !currentMember()) loginAs(name);
}

// Status block for the Admin Panel.
export function parentStatusHTML() {
  const a = state.auth;
  if (a.isParent) {
    const mapped = parentMemberName();
    return '<div class="parent-status">Parent: ' + esc(a.email) +
      (mapped ? '' : '<br><span class="parent-uid">Not in /admins yet. UID: <code>' + esc(a.uid) + '</code></span>') +
      '</div><button class="btn-sm" style="width:100%" onclick="window.signOutParent()">Parent sign out</button>';
  }
  return adminsActive() ? '' :
    '<div class="parent-status">Parents will sign in with email. <button class="btn-sm" onclick="window.adminPanelParentSignIn()">Parent sign in</button></div>';
}

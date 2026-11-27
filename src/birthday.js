// Member birthday (#362): optional month-day only (members/<name>/birthday 'MM-DD', no year or age).
// Banner is display only; setting it is admin-only.
import { state } from './state.js';
import { READONLY } from './config.js';
import { patchMember } from './firebase.js';
import { showToast } from './ui.js';
import { esc, jsq } from './utils.js';

// Pure: 'MM-DD' for a real calendar day (29 Feb allowed), else ''.
export function validBirthday(v) {
  const m = /^(\d{2})-(\d{2})$/.exec(String(v == null ? '' : v));
  if (!m) return '';
  const mo = Number(m[1]), d = Number(m[2]);
  const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= days[mo - 1] ? m[0] : '';
}

const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// Pure: names whose birthday is today (local). 29 Feb is celebrated on 28 Feb in non-leap years.
export function birthdayNames(members = state.members, now = new Date()) {
  const key = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  return Object.keys(members || {}).filter(n => {
    const b = validBirthday(members[n] && members[n].birthday);
    return b && (b === key || (b === '02-29' && key === '02-28' && !isLeap(now.getFullYear())));
  });
}

export function renderBirthdayBanner(members = state.members, now = new Date()) {
  const el = document.getElementById('birthday-banner');
  if (!el) return;
  const names = birthdayNames(members, now);
  el.classList.toggle('hidden', !names.length);
  // textContent, never innerHTML: names are plain text.
  el.textContent = names.length ? '🎂 Happy birthday, ' + names.join(' and ') + '!' : '';
}

// Admin only. '' clears it.
export async function setBirthday(name, value, isAdminFn) {
  if (READONLY || !isAdminFn()) return;
  if (!state.members[name]) return;
  const v = String(value || '').trim();
  const b = validBirthday(v);
  if (v && !b) { showToast('Birthday must be a real month and day, like 07-04'); return; }
  try { await patchMember(name, { birthday: b || null }); }
  catch (err) { showToast('Update failed: ' + (err.code || err.message)); }
}

export function birthdayAdminHTML(name) {
  const b = validBirthday(state.members[name] && state.members[name].birthday);
  return '<input type="text" class="admin-birthday" maxlength="5" inputmode="numeric" placeholder="MM-DD" aria-label="Birthday for ' + esc(name) + ' (month-day)" value="' + esc(b) + '" onchange="window.setBirthday(\'' + jsq(name) + '\', this.value)" />';
}

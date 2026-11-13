// "Download calendar (.ics)" for the This week planner (#316). Built in the browser from the same
// weekPlan() the planner shows and saved as a Blob: no network, no feed URL, no new /state data.
import { state } from './state.js';
import { READONLY } from './config.js';
import { weekPlan } from './utils.js';
import { showToast } from './ui.js';

export const ANYONE = '__anyone';

// RFC 5545 TEXT escaping: backslash, semicolon, comma, newline.
export const icsEscape = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');

// Fold long lines at 75 characters (continuation lines start with one space).
export function icsFold(line) {
  const out = [];
  for (let i = 0; i < line.length; i += i ? 74 : 75) out.push((i ? ' ' : '') + line.slice(i, i ? i + 74 : i + 75));
  return out.join('\r\n');
}

const compact = d => d.replace(/-/g, '');
const nextDay = d => { const [y, m, dd] = d.split('-').map(Number); const n = new Date(y, m - 1, dd + 1); return n.getFullYear() + String(n.getMonth() + 1).padStart(2, '0') + String(n.getDate()).padStart(2, '0'); };
const utcStamp = now => new Date(now).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// who: '' = everyone, ANYONE = unassigned chores, else a member name.
export function buildWeekIcs(tasks = state.tasks, who = '', now = Date.now()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FamilyFlow//This week//EN', 'CALSCALE:GREGORIAN'];
  for (const day of weekPlan(tasks, now)) {
    for (const it of day.items) {
      if (who === ANYONE ? it.person : who && it.person !== who) continue;
      lines.push('BEGIN:VEVENT', 'UID:' + icsEscape(it.id) + '-' + day.date + '@familyflow', 'DTSTAMP:' + utcStamp(now));
      if (it.dueTime) lines.push('DTSTART:' + compact(day.date) + 'T' + it.dueTime.replace(':', '') + '00', 'DURATION:PT30M');
      else lines.push('DTSTART;VALUE=DATE:' + compact(day.date), 'DTEND;VALUE=DATE:' + nextDay(day.date));
      lines.push('SUMMARY:' + icsEscape(it.name), 'DESCRIPTION:' + icsEscape('Assigned to ' + (it.person || 'Anyone')), 'END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(icsFold).join('\r\n') + '\r\n';
}

export function downloadWeekIcs(who = document.getElementById('week-ics-who')?.value || '') {
  if (READONLY) return;
  try {
    const url = URL.createObjectURL(new Blob([buildWeekIcs(state.tasks, who)], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'familyflow-this-week.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) { showToast('Could not create the calendar file'); }
}

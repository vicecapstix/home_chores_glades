import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { buildWeekIcs, icsEscape, icsFold, downloadWeekIcs, ANYONE } from '../src/weekics.js';
import { openWeek } from '../src/week.js';

// Wed 14 Oct 2026, week is Mon 12 - Sun 18 Oct.
const NOW = new Date(2026, 9, 14, 12, 0, 0).getTime();
const unfold = s => s.replace(/\r\n /g, '');
const base = { done: false, lastDone: new Date(2026, 9, 13, 12).getTime() };

beforeEach(() => {
  state.members = { Amy: { name: 'Amy', role: 'admin' }, Ben: { name: 'Ben', role: 'member' } };
  state.tasks = {
    a: { ...base, id: 'a', name: 'Dishes', freq: 'daily', person: 'Amy' },
    b: { ...base, id: 'b', name: 'Walk dog', freq: 'weekdays', days: [1], person: 'Ben', dueTime: '07:30' },
    c: { ...base, id: 'c', name: 'Bins', freq: 'weekdays', days: [2], person: '' },
  };
  document.body.innerHTML = '<select id="week-ics-who"></select><div id="week-list"></div><div id="week-modal" class="hidden"></div>';
});

describe('This week .ics export (#316)', () => {
  it('writes a VCALENDAR with all-day events and timed events using dueTime', () => {
    const ics = buildWeekIcs(state.tasks, '', NOW);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0')).toBe(true);
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261014');
    expect(ics).toContain('DTEND;VALUE=DATE:20261015');
    expect(ics).toContain('DTSTART:20261012T073000'); // Monday walk, local time, no zone shift
    expect(ics).toContain('SUMMARY:Walk dog');
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(7 + 1 + 1); // 7 days of dishes + walk + bins
  });
  it('filters by member and by Anyone', () => {
    const amy = buildWeekIcs(state.tasks, 'Amy', NOW);
    expect(amy).toContain('SUMMARY:Dishes');
    expect(amy).not.toContain('Walk dog');
    const anyone = buildWeekIcs(state.tasks, ANYONE, NOW);
    expect(anyone).toContain('SUMMARY:Bins');
    expect(anyone).not.toContain('Dishes');
  });
  it('escapes commas, semicolons, backslashes and newlines', () => {
    expect(icsEscape('a,b;c\\d\ne')).toBe('a\\,b\;c\\\\d\\ne');
    state.tasks = { z: { ...base, id: 'z', name: 'Sort, wash; fold\nlaundry', freq: 'daily', person: '' } };
    const ics = unfold(buildWeekIcs(state.tasks, '', NOW));
    expect(ics).toContain('SUMMARY:Sort\\, wash\; fold\\nlaundry');
    expect(ics).not.toMatch(/SUMMARY:[^\r]*\n[^\r]/); // no raw line break inside a value
  });
  it('folds long lines to 75 characters', () => {
    const long = 'SUMMARY:' + 'x'.repeat(200);
    const folded = icsFold(long).split('\r\n');
    expect(folded.every(l => l.length <= 75)).toBe(true);
    expect(folded.join('').replace(/ /g, '')).toBe(long);
  });
  it('makes no network calls and downloads a Blob', () => {
    const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy);
    const create = vi.fn(() => 'blob:x'); URL.createObjectURL = create; URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadWeekIcs('');
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(click).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it('lists members in the picker with names escaped', () => {
    state.members = { 'A<b>': { name: 'A<b>', role: 'member' } };
    openWeek();
    const sel = document.getElementById('week-ics-who');
    expect([...sel.options].map(o => o.value)).toEqual(['', ANYONE, 'A<b>']);
    expect(sel.querySelector('b')).toBeNull(); // no injected element
  });
});

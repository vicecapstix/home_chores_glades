import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { dueStatus, validTime } from '../src/utils.js';
import { cardHTML, initRender } from '../src/render.js';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));

afterEach(() => vi.useRealTimers());

// Wednesday 2026-05-13, local times
function at(h, m = 0) { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 4, 13, h, m, 0)); }
const DAY = 86400000;

describe('validTime', () => {
  it('accepts HH:MM and rejects junk', () => {
    expect(validTime('19:00')).toBe('19:00');
    expect(validTime('07:05')).toBe('07:05');
    for (const bad of ['', '7pm', '24:00', '19:60', '9:00', null, undefined, '19:00:00']) expect(validTime(bad)).toBe('');
  });
});

describe('dueStatus with dueTime', () => {
  it('daily task due today: soon before the time, overdue from the time on', () => {
    // done yesterday at 09:00 -> due today
    const lastDone = new Date(2026, 4, 12, 9, 0).getTime();
    const t = { freq: 'daily', done: false, lastDone, dueTime: '19:00' };
    at(18, 59); expect(dueStatus(t)).toBe('soon');
    at(19, 0);  expect(dueStatus(t)).toBe('overdue');
    at(23, 30); expect(dueStatus(t)).toBe('overdue');
  });
  it('without dueTime daily tasks are overdue from the next local calendar day (#102)', () => {
    const t = { freq: 'daily', done: false, lastDone: new Date(2026, 4, 12, 9, 0).getTime() };
    at(8, 0); expect(dueStatus(t)).toBe('overdue');
    at(9, 1); expect(dueStatus(t)).toBe('overdue');
  });
  it('weekly task due today flips overdue after the time; not on other days', () => {
    const due = { freq: 'weekly', done: false, lastDone: new Date(2026, 4, 6, 10, 0).getTime(), dueTime: '17:00' };
    at(16, 0); expect(dueStatus(due)).toBe('soon');
    at(17, 1); expect(dueStatus(due)).toBe('overdue');
    const later = { ...due, lastDone: new Date(2026, 4, 9, 10, 0).getTime() }; // due Sat 16th
    at(20, 0); expect(dueStatus(later)).toBe('ok');
  });
  it('Specific days: scheduled today -> overdue after time; unscheduled day -> unaffected', () => {
    const wed = { freq: 'weekdays', days: [3], done: false, lastDone: new Date(2026, 4, 6, 12, 0).getTime(), dueTime: '18:00' };
    at(12, 0); expect(dueStatus(wed)).toBe('soon');
    at(18, 0); expect(dueStatus(wed)).toBe('overdue');
    const tue = { ...wed, days: [2], lastDone: new Date(2026, 4, 12, 12, 0).getTime() }; // done Tue
    at(20, 0); expect(dueStatus(tue)).toBe('ok');
  });
  it('one-off due today flips after the time; due tomorrow does not', () => {
    at(20, 0);
    expect(dueStatus({ freq: 'once', dueDate: '2026-05-13', dueTime: '19:00', done: false })).toBe('overdue');
    expect(dueStatus({ freq: 'once', dueDate: '2026-05-14', dueTime: '19:00', done: false })).toBe('soon');
  });
  it('done tasks stay done; an invalid dueTime is ignored', () => {
    at(23, 0);
    expect(dueStatus({ freq: 'daily', done: true, lastDone: Date.now() - DAY / 2, dueTime: '19:00' })).toBe('done');
    expect(dueStatus({ freq: 'once', dueDate: '2026-05-13', dueTime: '99:99', done: false })).toBe('soon');
  });
});

describe('card shows the time', () => {
  beforeEach(() => { state.members = {}; state.tasks = {}; });
  it('adds an escaped time tag only for valid times', () => {
    at(8, 0);
    const base = { id: 't1', name: 'Dishes', freq: 'daily', done: false, lastDone: Date.now(), subtasks: {}, person: '' };
    expect(cardHTML({ ...base, dueTime: '19:00' })).toContain('⏰ 19:00');
    expect(cardHTML({ ...base, dueTime: '<img>' })).not.toContain('⏰');
    expect(cardHTML(base)).not.toContain('⏰');
  });
});

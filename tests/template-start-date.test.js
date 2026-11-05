import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';
import { initialLastDone, dueStatus } from '../src/utils.js';

vi.mock('../src/auth.js', () => ({ isAdmin: () => true }));
vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined),
  patchPaths: vi.fn().mockResolvedValue(undefined),
  patchRoot: vi.fn().mockResolvedValue(undefined),
}));
import * as ui from '../src/ui.js';

const DAYS = [new Date(2027, 2, 1, 9), new Date(2027, 0, 31, 9), new Date(2028, 1, 29, 9), new Date(2027, 4, 15, 9)];
const FREQS = [
  { freq: 'daily' }, { freq: 'weekly' }, { freq: 'fortnightly' }, { freq: 'monthly' },
  { freq: 'interval', intervalDays: 3 }, { freq: 'weekdays', days: [1, 3] },
];

beforeEach(() => {
  vi.useFakeTimers();
  state.templates = {}; state.nextId = 1; state.tasks = {};
  document.body.innerHTML = '<div id="tpl-list"></div><div id="templates-modal" class="hidden"></div><div id="toast"></div>';
});
afterEach(() => vi.useRealTimers());

describe('applyTemplate start date matches the Add form (#275)', () => {
  for (const day of DAYS) {
    for (const f of FREQS) {
      it(`${f.freq} on ${day.toDateString()}`, () => {
        vi.setSystemTime(day);
        state.templates = { tp: { id: 'tp', name: 'T', tasks: [{ name: 'X', difficulty: 'easy', ...f }] } };
        ui.applyTemplate('tp');
        const t = Object.values(state.tasks)[0];
        const addForm = initialLastDone(f.freq === 'interval' ? { freq: 'interval', intervalDays: f.intervalDays } : f.freq);
        expect(t.lastDone).toBe(addForm);
        expect(dueStatus(t)).not.toBe('overdue');
      });
    }
  }
  it('initialLastDone accepts a task-like object for monthly', () => {
    vi.setSystemTime(new Date(2027, 2, 1, 9));
    expect(initialLastDone({ freq: 'monthly' })).toBe(initialLastDone('monthly'));
  });
});

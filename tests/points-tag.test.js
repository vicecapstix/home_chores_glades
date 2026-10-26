import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/firebase.js', () => ({
  initFirebase: vi.fn(), getDb: vi.fn(), initAuth: vi.fn(), writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(),
  patchRoot: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(), onValue: vi.fn(), ref: vi.fn(),
}));

import { state } from '../src/state.js';
import { cardHTML } from '../src/render.js';
import { taskPoints } from '../src/utils.js';

const tag = t => {
  const w = document.createElement('div');
  w.innerHTML = cardHTML(t);
  return w.querySelector('.tag-pts');
};
const mk = (freq, difficulty, extra = {}) => ({ id: 't1', name: 'Dishes', freq, difficulty, person: '', done: false, ...extra });

describe('points tag on cards (#177)', () => {
  beforeEach(() => { state.members = {}; });

  const bases = { daily: 1, weekly: 3, weekdays: 3, fortnightly: 5, monthly: 8, once: 8 };
  const mults = { easy: 1, medium: 2, hard: 3 };
  for (const [freq, base] of Object.entries(bases)) {
    for (const [diff, m] of Object.entries(mults)) {
      it(freq + '/' + diff + ' shows +' + base * m + ' pts', () => {
        const el = tag(mk(freq, diff));
        expect(el.textContent).toBe('+' + base * m + ' pts');
        expect(el.getAttribute('aria-label')).toBe('worth ' + base * m + (base * m === 1 ? ' point' : ' points'));
        expect(base * m).toBe(taskPoints(mk(freq, diff)));
      });
    }
  }
  it('uses singular for 1 point and defaults to easy', () => {
    const el = tag(mk('daily', undefined));
    expect(el.textContent).toBe('+1 pts');
    expect(el.getAttribute('aria-label')).toBe('worth 1 point');
  });
  it('interval chores use the interval length', () => {
    expect(tag(mk('interval', 'easy', { intervalDays: 10 })).textContent).toBe('+5 pts');
  });
  it('is hidden once the chore is done', () => {
    expect(tag(mk('weekly', 'hard', { done: true, lastDone: Date.now() }))).toBeNull();
  });
  it('is rendered in the shared card markup, so the readonly TV view gets it too', () => {
    // cardHTML has no READONLY branch for the meta row
    expect(tag(mk('monthly', 'hard')).textContent).toBe('+24 pts');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
import { state } from '../src/state.js';
import { renderTvTomorrow } from '../src/tv.js';

const at = h => new Date(2026, 9, 14, h).getTime();
beforeEach(() => {
  document.body.innerHTML = '<div id="tv-tomorrow"></div>';
  state.members = {};
  state.tasks = { d: { id: 'd', name: 'Pack PE kit', freq: 'daily', person: '', done: false, lastDone: 0, subtasks: {} } };
});

describe('TV Tomorrow panel on ?readonly=1 (#355)', () => {
  it('fills the panel from 18:00 and clears it again before', () => {
    renderTvTomorrow(at(19));
    expect(document.getElementById('tv-tomorrow').textContent).toContain('Pack PE kit');
    renderTvTomorrow(at(9));
    expect(document.getElementById('tv-tomorrow').innerHTML).toBe('');
  });
});

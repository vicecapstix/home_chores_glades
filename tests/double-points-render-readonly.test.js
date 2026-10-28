import { it, expect, vi, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { initRender, render } from '../src/render.js';

afterEach(() => { vi.useRealTimers(); state.doublePoints = null; });

it('the TV (READONLY) render() shows the double-points banner on the event day (#225)', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 14, 12).getTime());
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  initRender(() => false, () => '');
  state.members = { Al: { name: 'Al', role: 'admin' } };
  state.tasks = {};
  state.doublePoints = { date: '2026-10-14', mult: 3 };
  document.body.innerHTML = '<div id="filters"></div><div id="task-list"></div><div id="member-chips"></div><select id="new-person"></select>' +
    '<i id="h-total"></i><i id="h-done"></i><i id="h-overdue"></i><i id="h-pct"></i><div id="prog"></div>' +
    '<div id="double-banner" class="double-banner hidden" role="status"></div>';
  render();
  const b = document.getElementById('double-banner');
  expect(b.classList.contains('hidden')).toBe(false);
  expect(b.textContent).toContain('×3');
});

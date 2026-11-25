import { it, expect, vi, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { initRender, render } from '../src/render.js';

afterEach(() => { vi.useRealTimers(); });

it('the TV (READONLY) render() shows the days-late label as text (#402)', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 5, 10, 12).getTime());
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  initRender(() => false, () => '');
  state.members = { Al: { name: 'Al', role: 'admin' } };
  state.tasks = { t1: { id: 't1', name: 'Bins', freq: 'once', dueDate: '2026-06-09', difficulty: 'easy' } };
  document.body.innerHTML = '<div id="filters"></div><div id="task-list"></div><div id="member-chips"></div><select id="new-person"></select>' +
    '<i id="h-total"></i><i id="h-done"></i><i id="h-overdue"></i><i id="h-pct"></i><div id="prog"></div>';
  render();
  const html = document.getElementById('task-list').innerHTML;
  expect(html).toContain('1 day late');
  expect(html).not.toContain('onclick="window.toggleTask');
});

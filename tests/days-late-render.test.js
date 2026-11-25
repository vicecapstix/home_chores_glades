import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { initRender, cardHTML, render } from '../src/render.js';

const NOW = new Date(2026, 5, 10, 12).getTime();
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); initRender(() => false, () => ''); });
afterEach(() => { vi.useRealTimers(); });

describe('days-late label on cards (#402)', () => {
  it('an overdue card shows the label as text next to Overdue', () => {
    const html = cardHTML({ id: 't1', name: 'Bins', freq: 'once', dueDate: '2026-06-07', difficulty: 'easy' });
    expect(html).toContain('Overdue');
    expect(html).toContain('<span class="tag tag-overdue late-label">3 days late</span>');
  });
  it('a card that is not overdue has no label', () => {
    const html = cardHTML({ id: 't2', name: 'Bins', freq: 'once', dueDate: '2026-06-12', difficulty: 'easy' });
    expect(html).not.toContain('late-label');
  });
  it('the card name is still escaped', () => {
    const html = cardHTML({ id: 't3', name: '<b>x</b>', freq: 'once', dueDate: '2026-06-09', difficulty: 'easy' });
    expect(html).toContain('1 day late');
    expect(html).not.toContain('<b>x</b>');
  });
  it('full render() output contains the label', () => {
    state.members = { Al: { name: 'Al', role: 'admin' } };
    state.tasks = { t1: { id: 't1', name: 'Bins', freq: 'once', dueDate: '2026-06-08', difficulty: 'easy' } };
    document.body.innerHTML = '<div id="filters"></div><div id="task-list"></div><div id="member-chips"></div><select id="new-person"></select>' +
      '<i id="h-total"></i><i id="h-done"></i><i id="h-overdue"></i><i id="h-pct"></i><div id="prog"></div>';
    render();
    expect(document.getElementById('task-list').innerHTML).toContain('2 days late');
  });
});

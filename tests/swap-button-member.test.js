import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { cardHTML, initRender } from '../src/render.js';

// Selectors of the rule that hides things from members: `body[data-role="member"] ... { display: none !important }`
const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
const hideRule = css.split('}').map(b => b.trim()).find(b => /display:\s*none\s*!important/.test(b) && b.includes('body[data-role="member"] .edit-btn'));
const memberHides = hideRule.split('{')[0].split(',').map(s => s.trim()).filter(s => s.startsWith('body[data-role="member"]'));

const base = { id: 't1', name: 'Dishes', freq: 'daily', person: 'Amy', done: false, lastDone: 0, subtasks: {} };
function mount(task, me) {
  initRender(() => false, () => me);
  document.body.setAttribute('data-role', 'member');
  document.body.innerHTML = cardHTML(task);
  return document.body;
}
const hidden = el => memberHides.some(s => el.matches(s));

describe('Offer swap button is visible to members (#346)', () => {
  beforeEach(() => { state.members = { Amy: { name: 'Amy' }, Ben: { name: 'Ben' } }; state.tasks = {}; state.swaps = {}; });

  it('is not hidden by the member CSS rules', () => {
    const btn = mount(base, 'Amy').querySelector('[title="Offer swap"]');
    expect(btn).not.toBeNull();
    expect(hidden(btn)).toBe(false);
    expect(btn.getAttribute('aria-label')).toBe('Offer Dishes to a sibling');
  });
  it('has a >=44px tap target', () => {
    expect(css).toMatch(/\.swap-btn\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/);
  });
  it('is not rendered on other people\'s chores or done chores', () => {
    expect(mount({ ...base, person: 'Ben' }, 'Amy').querySelector('[title="Offer swap"]')).toBeNull();
    expect(mount({ ...base, done: true }, 'Amy').querySelector('[title="Offer swap"]')).toBeNull();
  });
  it('Edit and Skip stay hidden for members', () => {
    const b = mount(base, 'Amy');
    expect(hidden(b.querySelector('[title="Edit"]'))).toBe(true);
    expect(hidden(b.querySelector('[title="Skip this time"]'))).toBe(true);
  });
});

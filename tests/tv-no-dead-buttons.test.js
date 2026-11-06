import { describe, it, expect, vi } from 'vitest';

const cfg = vi.hoisted(() => ({ ro: false }));
vi.mock('../src/config.js', async orig => ({ ...(await orig()), get READONLY() { return cfg.ro; } }));
vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));
import { cardHTML } from '../src/render.js';

const anyone = { id: 't1', name: 'Bins', freq: 'daily', person: '', done: false };

describe('TV (READONLY) cards have no dead controls (#219)', () => {
  it('unassigned card shows an Anyone tag instead of Claim', () => {
    cfg.ro = true;
    const html = cardHTML(anyone);
    expect(html).not.toContain('btn-claim');
    expect(html).toContain('Anyone');
  });
  it('the done tick is non-interactive: no onclick, no button', () => {
    cfg.ro = true;
    const html = cardHTML({ ...anyone, person: 'Al', done: true });
    expect(html).not.toContain('toggleTask');
    expect(html).not.toContain('<button type="button" role="checkbox"');
    expect(html).toContain('class="check checked"');
  });
  it('normal mode is unchanged: Claim button and tick button', () => {
    cfg.ro = false;
    const html = cardHTML(anyone);
    expect(html).toContain('btn-claim');
    expect(html).toContain("window.toggleTask('t1')");
    expect(html).toContain('role="checkbox"');
  });
});

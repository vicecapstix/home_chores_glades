import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/config.js', () => ({ READONLY: true }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { downloadWeekIcs } from '../src/weekics.js';

describe('.ics export on the readonly TV (#316)', () => {
  it('does nothing when READONLY', () => {
    const create = vi.fn(); URL.createObjectURL = create;
    downloadWeekIcs('');
    expect(create).not.toHaveBeenCalled();
  });
  it('the toolbar is hidden by the readonly CSS rule', async () => {
    const css = (await import('node:fs')).readFileSync('src/style.css', 'utf8');
    expect(css).toMatch(/body\[data-readonly\] \.week-ics\s*\{\s*display:\s*none/);
  });
});

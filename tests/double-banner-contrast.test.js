import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Contrast of the double-points banner in both themes (#225 review).
const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8');
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
  .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
const lum = c => { const [r, g, b] = hex(c); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const varIn = (block, name) => new RegExp(name + ':\\s*(#[0-9A-Fa-f]{6})').exec(block)[1];

describe('double-points banner is readable in light and dark themes', () => {
  const dark = /\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(css)[1];
  const root = /:root\s*\{([^}]*)\}/.exec(css)[1];

  it('light theme: white text on --warn meets AA (4.5:1)', () => {
    expect(ratio('#FFFFFF', varIn(root, '--warn'))).toBeGreaterThanOrEqual(4.5);
  });

  it('dark theme: has its own text colour rule for the banner', () => {
    expect(css).toMatch(/\[data-theme="dark"\]\s+\.double-banner\s*\{[^}]*color:\s*var\(--bg\)/);
  });

  it('dark theme: --bg text on dark --warn meets AA (4.5:1); white would not', () => {
    const warn = varIn(dark, '--warn');
    expect(ratio(varIn(dark, '--bg'), warn)).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#FFFFFF', warn)).toBeLessThan(4.5);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
const block = q => {
  const i = css.indexOf(q);
  expect(i).toBeGreaterThan(-1);
  let d = 0, j = css.indexOf('{', i);
  const start = j;
  for (; j < css.length; j++) { if (css[j] === '{') d++; if (css[j] === '}' && --d === 0) break; }
  return css.slice(start, j);
};
const Q900 = '@media (min-width: 900px) {\n  body.tv';
const Q1200 = '@media (min-width: 1200px) {\n  body.tv';

describe('TV layout keyed on body.tv', () => {
  it('has a 900px breakpoint with body.tv rules and 2 columns', () => {
    const b = block(Q900);
    expect(b).toContain('body.tv #tv-clock');
    expect(b).toContain('body.tv #task-list');
    expect(b).toContain('repeat(2,');
  });
  it('uses 3 columns from 1200px', () => {
    expect(block(Q1200)).toContain('repeat(3,');
  });
  it('task names are at least 1.4rem', () => {
    const m = block(Q900).match(/body\.tv \.task-name \{ font-size: ([\d.]+)rem/);
    expect(parseFloat(m[1])).toBeGreaterThanOrEqual(1.4);
  });
  it('no horizontal scroll guard on the TV body', () => {
    expect(block(Q900)).toContain('overflow-x: hidden');
  });
  it('old 1200px data-readonly TV rules are gone', () => {
    expect(css).not.toMatch(/@media \(min-width: 1200px\) \{\s*body\[data-readonly\]/);
  });
  it('below 900px readonly keeps the list (no body.tv grid outside the TV queries)', () => {
    const outside = css.replace(block(Q900), '').replace(block(Q1200), '');
    expect(outside).not.toMatch(/body\.tv #task-list/);
  });
});

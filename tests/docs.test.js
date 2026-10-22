import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const read = f => readFileSync(resolve(root, f), 'utf8');

describe('docs stay in step with the code (#39)', () => {
  const readme = read('README.md');
  const claude = read('CLAUDE.md');
  it('README uses the FamilyFlow name and the real FB_URL location', () => {
    expect(readme.startsWith('# FamilyFlow')).toBe(true);
    expect(readme).toContain('src/config.js');
    expect(readme).not.toMatch(/no build step/i);
    expect(readme).not.toMatch(/CORRECT_HASH/);
  });
  it('README documents the npm workflow', () => {
    for (const c of ['npm ci', 'npm run dev', 'npm test', 'npm run build:pages']) expect(readme).toContain(c);
  });
  it('CLAUDE.md names every src module and says dist/ is git-ignored', () => {
    for (const f of readdirSync(resolve(root, 'src')).filter(n => n.endsWith('.js'))) expect(claude).toContain(f);
    expect(claude).toMatch(/dist\/.*git-ignored/);
  });
});

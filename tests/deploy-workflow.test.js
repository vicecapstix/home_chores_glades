import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = f => resolve(__dirname, '..', f);
const read = f => readFileSync(root(f), 'utf8');

describe('auto-deploy of root files after a merge (#136)', () => {
  it('has a workflow that runs on push to main only', () => {
    expect(existsSync(root('.github/workflows/deploy-root.yml'))).toBe(true);
    const y = read('.github/workflows/deploy-root.yml');
    expect(y).toMatch(/push:\s*\n\s*branches:\s*\[main\]/);
    expect(y).not.toMatch(/pull_request/);
  });
  it('rebuilds with build:pages and commits as the bot with write permission', () => {
    const y = read('.github/workflows/deploy-root.yml');
    expect(y).toMatch(/permissions:\s*\n\s*contents:\s*write/);
    expect(y).toMatch(/runs-on:\s*ubuntu-latest/);
    expect(y).toMatch(/npm ci/);
    expect(y).toMatch(/npm run build:pages/);
    expect(y).toMatch(/git push/);
    expect(y).toContain('github-actions[bot]');
  });
  it('checks out main and commits and pushes all six root files to main', () => {
    const y = read('.github/workflows/deploy-root.yml');
    expect(y).toMatch(/uses:\s*actions\/checkout@\S+\s*\n\s*with:\s*\n\s*ref:\s*main/);
    const files = y.match(/^\s*FILES="([^"]+)"/m);
    expect(files).not.toBeNull();
    expect(files[1].split(/\s+/).sort()).toEqual(['icon-192.png', 'icon-512.png', 'icon.svg', 'index.html', 'manifest.webmanifest', 'sw.js']);
    expect(y).toMatch(/^\s*git add \$FILES\s*$/m);
    expect(y).toMatch(/^\s*git commit -m "[^"]+"\s*$/m);
    expect(y).toMatch(/^\s*git push origin HEAD:main\s*$/m);
  });
  it('cannot loop on its own commits and queues instead of racing', () => {
    const y = read('.github/workflows/deploy-root.yml');
    expect(y).toMatch(/^\s*if:\s*github\.actor\s*!=\s*'github-actions\[bot\]'/m);
    // The bot commit must not carry a CI-skip tag, or Pages may not publish it.
    expect(y).not.toMatch(/\[(skip ci|ci skip|no ci|skip actions|actions skip)\]/i);
    expect(y).toMatch(/concurrency:/);
    expect(y).toMatch(/cancel-in-progress:\s*false/);
  });
  it('only commits when the root files actually changed', () => {
    const y = read('.github/workflows/deploy-root.yml');
    expect(y).toMatch(/git (diff --quiet|status --porcelain)/);
  });
  it('uses no secrets, no paid services', () => {
    const y = read('.github/workflows/deploy-root.yml');
    expect(y).not.toMatch(/secrets\.(?!GITHUB_TOKEN)/);
    expect(y).not.toMatch(/vercel|netlify|firebase deploy/i);
  });
  it('PR CI no longer fails PRs for stale root files', () => {
    const y = read('.github/workflows/ci.yml');
    expect(y).not.toMatch(/cmp dist\/index\.html index\.html/);
    expect(y).not.toMatch(/Root deployed files are stale/);
  });
  it('docs describe the new flow', () => {
    const c = read('CLAUDE.md');
    expect(c).toMatch(/deploy-root\.yml/);
    expect(c).not.toMatch(/every PR that changes `src\/` must run `npm run build:pages`/);
    expect(read('README.md')).toMatch(/deploy-root\.yml/);
  });
});

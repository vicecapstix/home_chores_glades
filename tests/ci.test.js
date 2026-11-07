import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = f => resolve(__dirname, '..', f);

describe('CI and deploy tooling', () => {
  it('package.json has build:pages that copies dist to root', () => {
    const pkg = JSON.parse(readFileSync(root('package.json'), 'utf8'));
    expect(pkg.scripts['build:pages']).toBe('vite build && cp dist/index.html index.html');
  });
  it('ci workflow runs tests and build on PRs and main with free runners', () => {
    expect(existsSync(root('.github/workflows/ci.yml'))).toBe(true);
    const y = readFileSync(root('.github/workflows/ci.yml'), 'utf8');
    expect(y).toMatch(/pull_request/);
    expect(y).toMatch(/runs-on:\s*ubuntu-latest/);
    expect(y).toMatch(/npm ci/);
    expect(y).toMatch(/npm test/);
    expect(y).toMatch(/npm run build/);
    expect(y).not.toMatch(/secrets\./);
  });
  it('deploy workflow rebuilds every deployed file and verifies it', () => {
    const y = readFileSync(root('.github/workflows/deploy-root.yml'), 'utf8');
    expect(y).not.toMatch(/continue-on-error/);
    // The verify step must compare every deployed root file with the fresh dist/ build.
    const at = y.indexOf('Verify root files match a fresh build');
    expect(at).toBeGreaterThan(-1);
    const verify = y.slice(at);
    expect(verify).toMatch(/cmp\s+"dist\/\$f"\s+"\$f"/);
    for (const f of ['index.html', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png']) {
      expect(y).toContain(f);
      expect(verify).toContain(f);
    }
  });
  it('build:pages also copies the PWA files to root', () => {
    const pkg = JSON.parse(readFileSync(root('package.json'), 'utf8'));
    const post = pkg.scripts['postbuild:pages'];
    for (const f of ['sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png']) {
      expect(post).toContain(f);
    }
  });
  it('CLAUDE.md documents the root index.html deploy', () => {
    const c = readFileSync(root('CLAUDE.md'), 'utf8');
    expect(c).toMatch(/build:pages/);
    expect(c).toMatch(/deploy-root\.yml/);
    expect(c).not.toMatch(/the built `dist\/index\.html` must be committed/);
  });
});

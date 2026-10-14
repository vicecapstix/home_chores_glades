import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canRegister, registerServiceWorker } from '../src/pwa.js';

const pub = f => readFileSync(resolve(__dirname, '../src/public', f));
const https = { protocol: 'https:', hostname: 'x.github.io' };

describe('manifest', () => {
  const m = JSON.parse(pub('manifest.webmanifest').toString());
  it('is valid and installable', () => {
    expect(m.name).toBe('FamilyFlow');
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('./');
    expect(m.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
  it('has 192 and 512 PNG icons that exist and are PNGs', () => {
    ['192x192', '512x512'].forEach(sz => {
      const icon = m.icons.find(i => i.sizes === sz && i.type === 'image/png');
      expect(icon).toBeTruthy();
      const buf = pub(icon.src);
      expect(buf.subarray(1, 4).toString()).toBe('PNG');
      expect(buf.readUInt32BE(16)).toBe(parseInt(sz, 10));
    });
  });
  it('is linked from src/index.html', () => {
    const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
    expect(html).toContain('rel="manifest" href="manifest.webmanifest"');
  });
});

describe('service worker registration is guarded', () => {
  it('no-ops outside production, without support, or on insecure origins', async () => {
    const nav = { serviceWorker: { register: vi.fn() } };
    expect(canRegister(nav, https, false)).toBe(false);
    expect(canRegister({}, https, true)).toBe(false);
    expect(canRegister(nav, { protocol: 'http:', hostname: 'example.com' }, true)).toBe(false);
    expect(await registerServiceWorker(nav, { protocol: 'http:', hostname: 'example.com' }, true)).toBeNull();
    expect(nav.serviceWorker.register).not.toHaveBeenCalled();
  });
  it('registers on https and localhost in production', async () => {
    const reg = {};
    const nav = { serviceWorker: { register: vi.fn().mockResolvedValue(reg) } };
    expect(await registerServiceWorker(nav, https, true)).toBe(reg);
    expect(nav.serviceWorker.register).toHaveBeenCalledWith('sw.js');
    expect(canRegister(nav, { protocol: 'http:', hostname: 'localhost' }, true)).toBe(true);
  });
  it('swallows registration errors', async () => {
    const nav = { serviceWorker: { register: vi.fn().mockRejectedValue(new Error('nope')) } };
    expect(await registerServiceWorker(nav, https, true)).toBeNull();
  });
});

describe('sw.js behaviour (static checks)', () => {
  const sw = pub('sw.js').toString();
  it('is network-first, same-origin, GET-only', () => {
    expect(sw).toMatch(/req\.method !== 'GET'/);
    expect(sw).toMatch(/url\.origin !== self\.location\.origin/);
    expect(sw.indexOf('fetch(req)')).toBeLessThan(sw.indexOf('caches.match(req)'));
  });
  it('never references Firebase hosts', () => {
    expect(sw).not.toMatch(/firebase|googleapis/i);
  });
});

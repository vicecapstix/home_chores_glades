import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const code = readFileSync(resolve(__dirname, '../src/public/sw.js'), 'utf8');

function load({ fetchImpl, cached = {} }) {
  const puts = [];
  const resp = (body, ok = true) => ({ ok, body, clone() { return resp(body, ok); } });
  const store = { ...cached };
  const ctx = {
    self: { addEventListener() {}, location: { origin: 'https://x.github.io' } },
    URL, setTimeout, clearTimeout, Promise,
    fetch: fetchImpl,
    caches: {
      match: vi.fn(async r => store[typeof r === 'string' ? r : r.url]),
      open: vi.fn(async () => ({ put: async (r, v) => { puts.push([r.url, v]); } })),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return { ctx, puts, resp };
}
const nav = { url: 'https://x.github.io/app/', mode: 'navigate', method: 'GET' };

describe('service worker network timeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('cache name is bumped and cross-origin is skipped', () => {
    expect(code).toContain("'familyflow-shell-v3'");
    expect(code).toContain('url.origin !== self.location.origin');
  });

  it('fast network wins and refreshes the cache', async () => {
    const net = { ok: true, body: 'net', clone() { return this; } };
    const { ctx, puts } = load({ fetchImpl: () => Promise.resolve(net), cached: { [nav.url]: 'old' } });
    const p = ctx.shellResponse(nav, null, 3000);
    await vi.advanceTimersByTimeAsync(10);
    expect(await p).toBe(net);
    expect(puts).toHaveLength(1);
  });

  it('slow network falls back to the cache, then still refreshes it', async () => {
    let release;
    const net = { ok: true, body: 'net', clone() { return this; } };
    const { ctx, puts } = load({
      fetchImpl: () => new Promise(r => { release = () => r(net); }),
      cached: { [nav.url]: 'cached' },
    });
    const p = ctx.shellResponse(nav, null, 3000);
    await vi.advanceTimersByTimeAsync(3001);
    expect(await p).toBe('cached');
    expect(puts).toHaveLength(0);
    release();
    await vi.advanceTimersByTimeAsync(10);
    expect(puts).toHaveLength(1);
  });

  it('slow network with no cached copy waits for the network', async () => {
    let release;
    const net = { ok: true, body: 'net', clone() { return this; } };
    const { ctx } = load({ fetchImpl: () => new Promise(r => { release = () => r(net); }) });
    const p = ctx.shellResponse(nav, null, 3000);
    await vi.advanceTimersByTimeAsync(5000);
    release();
    await vi.advanceTimersByTimeAsync(10);
    expect(await p).toBe(net);
  });

  it('offline (fetch rejects) serves the cache, else the app shell', async () => {
    const fail = () => Promise.reject(new Error('offline'));
    const a = load({ fetchImpl: fail, cached: { [nav.url]: 'cached' } });
    expect(await a.ctx.shellResponse(nav, null, 3000)).toBe('cached');
    const b = load({ fetchImpl: fail, cached: { './': 'shell' } });
    expect(await b.ctx.shellResponse(nav, null, 3000)).toBe('shell');
  });

  it('keeps the worker alive for the background refresh', () => {
    const keep = vi.fn();
    const { ctx } = load({ fetchImpl: () => new Promise(() => {}) });
    ctx.shellResponse(nav, keep, 3000);
    expect(keep).toHaveBeenCalledTimes(1);
  });
});

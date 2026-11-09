import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { versionTag, watchForUpdates, reloadWhenIdle } from '../src/pwa.js';
import { openModal, closeModal, anyModalOpen } from '../src/modals.js';

const https = { protocol: 'https:', hostname: 'x.github.io', pathname: '/home_chores_glades/' };
const headRes = tag => ({ ok: true, headers: { get: k => (k === 'etag' ? tag : null) } });
const swNav = (controller = {}) => {
  const l = {};
  return { nav: { serviceWorker: { controller, addEventListener: (e, f) => { l[e] = f; } } }, fire: e => l[e]() };
};
const flush = () => new Promise(r => setTimeout(r, 0));

describe('versionTag (#312)', () => {
  it('uses the ETag, falls back to Last-Modified, null on error/not ok', async () => {
    expect(await versionTag(async () => headRes('"a"'), '/x')).toBe('"a"');
    expect(await versionTag(async () => ({ ok: true, headers: { get: k => (k === 'last-modified' ? 'Mon' : null) } }), '/x')).toBe('Mon');
    expect(await versionTag(async () => ({ ok: false, headers: { get: () => 'x' } }), '/x')).toBe(null);
    expect(await versionTag(async () => { throw new Error('offline'); }, '/x')).toBe(null);
  });
});

describe('watchForUpdates (#312)', () => {
  it('is off when the service worker is not available (http / dev / no support)', () => {
    const onUpdate = vi.fn();
    expect(watchForUpdates({ onUpdate, nav: {}, loc: https, prod: true, fetchFn: vi.fn() })).toBe(null);
    expect(watchForUpdates({ onUpdate, nav: swNav().nav, loc: { protocol: 'http:', hostname: 'x.com' }, prod: true, fetchFn: vi.fn() })).toBe(null);
    expect(watchForUpdates({ onUpdate, nav: swNav().nav, loc: https, prod: false, fetchFn: vi.fn() })).toBe(null);
  });
  it('a controllerchange on an already-controlled page reports a new version once', () => {
    vi.useFakeTimers();
    const { nav, fire } = swNav();
    const onUpdate = vi.fn();
    const stop = watchForUpdates({ onUpdate, nav, loc: https, prod: true, fetchFn: async () => headRes('"a"') });
    fire('controllerchange'); fire('controllerchange');
    expect(onUpdate).toHaveBeenCalledTimes(1);
    stop(); vi.useRealTimers();
  });
  it('first install (no controller before) does not report an update', () => {
    const { nav } = swNav(null);
    const add = vi.spyOn(nav.serviceWorker, 'addEventListener');
    const stop = watchForUpdates({ onUpdate: vi.fn(), nav, loc: https, prod: true, fetchFn: async () => headRes('"a"') });
    expect(add).not.toHaveBeenCalled();
    stop();
  });
  it('the periodic check reports a changed ETag once, and not an unchanged one', async () => {
    vi.useFakeTimers();
    let tag = '"v1"';
    const reg = { update: vi.fn().mockResolvedValue(undefined) };
    const onUpdate = vi.fn();
    const stop = watchForUpdates({ onUpdate, reg, nav: swNav().nav, loc: https, prod: true, fetchFn: async () => headRes(tag), intervalMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onUpdate).not.toHaveBeenCalled();
    tag = '"v2"';
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith('"v2"');
    expect(reg.update).toHaveBeenCalled();
    stop(); vi.useRealTimers();
  });
  it('a failing check (offline) reports nothing', async () => {
    const onUpdate = vi.fn();
    const stop = watchForUpdates({ onUpdate, nav: swNav().nav, loc: https, prod: true, fetchFn: async () => { throw new Error('x'); }, intervalMs: 5 });
    await flush();
    expect(onUpdate).not.toHaveBeenCalled();
    stop();
  });
});

describe('reloadWhenIdle (TV auto-reload, #312)', () => {
  const store = () => { const m = {}; return { getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = v; } }; };
  it('reloads once when idle, never twice for the same version (no loop)', () => {
    const reload = vi.fn(), storage = store();
    expect(reloadWhenIdle('v2', { busy: () => false, reload, storage })).toBe(true);
    expect(reloadWhenIdle('v2', { busy: () => false, reload, storage })).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadWhenIdle('v3', { busy: () => false, reload, storage })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
  it('waits while a modal is open and retries later', () => {
    let open = true;
    const reload = vi.fn(), storage = store(), jobs = [];
    expect(reloadWhenIdle('v2', { busy: () => open, reload, storage, schedule: f => jobs.push(f) })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    open = false; jobs.shift()();
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it('still reloads once when storage is blocked', () => {
    const reload = vi.fn(), storage = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
    expect(reloadWhenIdle('v2', { busy: () => false, reload, storage })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('modal busy signal and wiring (#312)', () => {
  it('anyModalOpen follows openModal/closeModal', () => {
    document.body.innerHTML = '<div id="m1" class="hidden"></div>';
    expect(anyModalOpen()).toBe(false);
    openModal('m1');
    expect(anyModalOpen()).toBe(true);
    closeModal('m1');
    expect(anyModalOpen()).toBe(false);
  });
  const read = f => readFileSync(resolve(__dirname, '../src', f), 'utf8');
  it('main.js: TV auto-reloads, editing devices only get the banner; banner uses the .hidden pattern', () => {
    const main = read('main.js');
    expect(main).toMatch(/READONLY\s*\?\s*reloadWhenIdle\(/);
    expect(main).toContain("getElementById('update-banner')");
    expect(read('index.html')).toMatch(/<div id="update-banner" class="hidden"[^>]*role="status"/);
    expect(read('style.css')).toContain('#update-banner.hidden { display: none; }');
    expect(read('index.html')).not.toMatch(/id="update-banner"[^>]*style=/);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setConnection, markSynced, watchConnection, formatTime, _resetForTests } from '../src/connection.js';

const src = f => readFileSync(resolve(__dirname, '../src', f), 'utf8');

function fakeFirebase() {
  let cb;
  const onValue = vi.fn((r, fn) => { cb = fn; return () => {}; });
  const ref = vi.fn((db, path) => ({ db, path }));
  return { onValue, ref, emit: v => cb({ val: () => v }) };
}

beforeEach(() => {
  vi.useFakeTimers();
  _resetForTests();
  document.body.innerHTML = '<div id="offline-banner" class="hidden"></div><div class="live-dot" title="Live sync"></div><div id="tv-synced"></div>';
});
afterEach(() => vi.useRealTimers());

const dot = () => document.querySelector('.live-dot');
const banner = () => document.getElementById('offline-banner');

describe('watchConnection', () => {
  it('subscribes to .info/connected', () => {
    const fb = fakeFirebase();
    watchConnection('DB', fb);
    expect(fb.ref).toHaveBeenCalledWith('DB', '.info/connected');
  });
  it('shows the offline banner after a drop and hides it on reconnect', () => {
    const fb = fakeFirebase();
    watchConnection('DB', fb);
    fb.emit(true);
    expect(banner().classList.contains('hidden')).toBe(true);
    expect(dot().classList.contains('offline')).toBe(false);
    fb.emit(false);
    expect(banner().classList.contains('hidden')).toBe(false);
    expect(dot().classList.contains('offline')).toBe(true);
    expect(dot().title).toBe('Offline');
    fb.emit(true);
    expect(banner().classList.contains('hidden')).toBe(true);
    expect(dot().title).toBe('Live sync');
  });
  it('does not flash offline during the first connection attempt', () => {
    const fb = fakeFirebase();
    watchConnection('DB', fb);
    fb.emit(false);
    expect(banner().classList.contains('hidden')).toBe(true);
    vi.advanceTimersByTime(4100);
    expect(banner().classList.contains('hidden')).toBe(false);
  });
  it('a first connect inside the grace window never shows offline', () => {
    const fb = fakeFirebase();
    watchConnection('DB', fb);
    fb.emit(false); fb.emit(true);
    vi.advanceTimersByTime(5000);
    expect(banner().classList.contains('hidden')).toBe(true);
  });
});

describe('setConnection / markSynced', () => {
  it('tolerates missing elements', () => {
    document.body.innerHTML = '';
    expect(() => setConnection(false)).not.toThrow();
    expect(() => markSynced()).not.toThrow();
  });
  it('writes "Last synced hh:mm"', () => {
    const d = new Date(2026, 9, 14, 7, 5);
    markSynced(d);
    expect(document.getElementById('tv-synced').textContent).toBe('Last synced ' + formatTime(d));
  });
});

describe('wiring', () => {
  it('markup and styles exist, banner follows the .hidden pattern', () => {
    const html = src('index.html'), css = src('style.css'), main = src('main.js');
    expect(html).toContain('id="offline-banner" class="hidden"');
    expect(html).toContain('id="tv-synced"');
    expect(css).toMatch(/#offline-banner\.hidden \{ display: none; \}/);
    expect(css).toMatch(/body\[data-readonly\] #tv-synced \{ display: block; \}/);
    expect(main).toContain('watchConnection(db, { onValue, ref })');
    expect(main).toContain('markSynced()');
  });
});

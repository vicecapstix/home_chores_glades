// #258: the offline banner / sync dot / cache banner say how old the data on screen is.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { setConnection, markSynced, setLastUpdated, setPendingCount, formatUpdated, _resetForTests } from '../src/connection.js';
import { setCacheBanner } from '../src/cache.js';

const banner = () => document.getElementById('offline-banner');
const dot = () => document.querySelector('.live-dot');
const at = (iso) => new Date(iso);

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(at('2026-05-11T20:00:00'));
  _resetForTests();
  document.body.innerHTML = '<div id="cache-banner" class="hidden"></div><div id="offline-banner" class="hidden"></div><div class="live-dot" title="Live sync"></div><div id="tv-synced"></div>';
});
afterEach(() => vi.useRealTimers());

describe('formatUpdated (AC2)', () => {
  const now = at('2026-05-11T20:00:00').getTime();
  it('same day is just the time', () => expect(formatUpdated(at('2026-05-11T14:05:00').getTime(), now)).toBe(new Date(2026, 4, 11, 14, 5).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
  it('previous day says yesterday', () => expect(formatUpdated(at('2026-05-10T21:10:00').getTime(), now)).toMatch(/^yesterday .*\d/));
  it('older shows the date', () => expect(formatUpdated(at('2026-05-04T21:10:00').getTime(), now)).toMatch(/4/));
  it('unknown time gives nothing', () => { expect(formatUpdated(0, now)).toBe(''); expect(formatUpdated(undefined, now)).toBe(''); });
});

describe('offline banner and dot (AC1, AC2)', () => {
  it('after a live snapshot at 14:05, going offline shows that time in banner and tooltip', () => {
    vi.setSystemTime(at('2026-05-11T14:05:00'));
    markSynced(new Date());
    vi.setSystemTime(at('2026-05-11T14:20:00'));
    setConnection(true); setConnection(false);
    const t = formatUpdated(at('2026-05-11T14:05:00').getTime());
    expect(banner().textContent).toContain('Last updated ' + t);
    expect(dot().title).toBe('Offline · last updated ' + t);
  });
  it('the waiting-changes banner also carries the time', () => {
    markSynced(new Date());
    setConnection(true); setConnection(false); setPendingCount(2);
    expect(banner().textContent).toMatch(/^2 changes waiting.*Last updated /);
  });
  it('says yesterday for data from the previous day', () => {
    markSynced(at('2026-05-10T21:10:00'));
    setConnection(true); setConnection(false);
    expect(banner().textContent).toMatch(/Last updated yesterday /);
  });
  it('shows no time while online or before anything was received', () => {
    setConnection(true);
    expect(dot().title).toBe('Live sync');
    _resetForTests(); setConnection(true); setConnection(false);
    expect(banner().textContent).toBe('Offline — changes will sync when you reconnect');
    expect(dot().title).toBe('Offline');
  });
});

describe('cached start (AC3)', () => {
  it('shows the cache time in the cache banner and the offline banner until a live snapshot', () => {
    const saved = at('2026-05-10T21:10:00').getTime();
    setCacheBanner(true, document, saved); setLastUpdated(saved);
    expect(document.getElementById('cache-banner').textContent).toBe('Showing saved data from ' + formatUpdated(saved) + ' — connecting…');
    setConnection(true); setConnection(false);
    expect(banner().textContent).toContain('Last updated yesterday');
    markSynced(new Date()); setConnection(true); setConnection(false);
    expect(banner().textContent).toContain('Last updated ' + formatUpdated(Date.now()));
    expect(banner().textContent).not.toContain('yesterday');
  });
  it('keeps the old text when the cache has no savedAt', () => {
    document.getElementById('cache-banner').textContent = 'Showing saved data — connecting…';
    setCacheBanner(true, document, undefined);
    expect(document.getElementById('cache-banner').textContent).toBe('Showing saved data — connecting…');
  });
});

describe('display only (AC4)', () => {
  it('uses no Firebase and no HTML injection', () => {
    const c = readFileSync('src/connection.js', 'utf8');
    expect(c).not.toMatch(/innerHTML|patch|writeState|set\(/);
  });
});

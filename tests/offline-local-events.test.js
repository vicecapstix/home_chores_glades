// #310: local events fired while offline must not move "Last updated" or the cache savedAt.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import * as conn from '../src/connection.js';

const { setConnection, markSynced, formatUpdated, _resetForTests } = conn;
const banner = () => document.getElementById('offline-banner');
const at = (iso) => new Date(iso);

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(at('2026-05-11T14:05:00'));
  _resetForTests();
  document.body.innerHTML = '<div id="offline-banner" class="hidden"></div><div class="live-dot"></div><div id="tv-synced"></div>';
});
afterEach(() => vi.useRealTimers());

describe('offline local events (#310)', () => {
  it('a local event while disconnected leaves "Last updated" at the last server time', () => {
    setConnection(true); markSynced(new Date());               // server snapshot at 14:05
    setConnection(false);
    vi.setSystemTime(at('2026-05-11T14:40:00'));
    markSynced(new Date());                                    // local tick echo while offline
    conn.setPendingCount(1);                                   // the pending tag repaints the banner
    expect(banner().textContent).toContain('Last updated ' + formatUpdated(at('2026-05-11T14:05:00').getTime()));
    expect(document.getElementById('tv-synced').textContent).not.toContain('14:40');
  });

  it('reconnecting and receiving a server snapshot updates it as before', () => {
    setConnection(true); markSynced(new Date());
    setConnection(false);
    vi.setSystemTime(at('2026-05-11T14:50:00'));
    setConnection(true); markSynced(new Date());
    setConnection(false);
    expect(banner().textContent).toContain('Last updated ' + formatUpdated(at('2026-05-11T14:50:00').getTime()));
  });

  it('isDisconnected() is false until Firebase reports, true after offline, false after online', () => {
    expect(conn.isDisconnected?.()).toBe(false);
    setConnection(false); expect(conn.isDisconnected?.()).toBe(true);
    setConnection(true); expect(conn.isDisconnected?.()).toBe(false);
  });

  it('main.js skips saveSnapshot while disconnected so the cache savedAt does not move', () => {
    const src = readFileSync('src/main.js', 'utf8');
    expect(src).toMatch(/if \(!isDisconnected\(\)\) saveSnapshot\(state\);/);
  });
});

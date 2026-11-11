import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true }));
import { isNightTime, updateTvNight, wakeTv, isTvDim, createTvCycle, WAKE_MS, PANELS } from '../src/tv.js';

const at = (h, m = 0) => new Date(2026, 9, 14, h, m).getTime();

describe('TV night mode (#315)', () => {
  let body;
  beforeEach(() => { body = document.createElement('body'); updateTvNight(at(12), body); });
  afterEach(() => { vi.useRealTimers(); });

  it('isNightTime: dim from 21:00 to 06:30, boundaries inclusive of start / exclusive of end', () => {
    expect(isNightTime(at(20, 59))).toBe(false);
    expect(isNightTime(at(21, 0))).toBe(true);
    expect(isNightTime(at(23, 59))).toBe(true);
    expect(isNightTime(at(0, 0))).toBe(true);
    expect(isNightTime(at(6, 29))).toBe(true);
    expect(isNightTime(at(6, 30))).toBe(false);
    expect(isNightTime(at(12))).toBe(false);
  });

  it('the body class toggles at 20:59 / 21:00 / 06:29 / 06:30 on the TV', () => {
    expect(updateTvNight(at(20, 59), body)).toBe(false);
    expect(body.classList.contains('tv-night')).toBe(false);
    expect(updateTvNight(at(21, 0), body)).toBe(true);
    expect(body.classList.contains('tv-night')).toBe(true);
    expect(updateTvNight(at(6, 29), body)).toBe(true);
    expect(updateTvNight(at(6, 30), body)).toBe(false);
    expect(body.classList.contains('tv-night')).toBe(false);
  });

  it('a key/tap wake lifts the dim for 5 minutes, then it dims again', () => {
    updateTvNight(at(22, 0), body);
    expect(isTvDim()).toBe(true);
    wakeTv(at(22, 0));
    expect(updateTvNight(at(22, 4), body)).toBe(false);
    expect(body.classList.contains('tv-night')).toBe(false);
    expect(updateTvNight(at(22, 0) + WAKE_MS, body)).toBe(true);
    expect(body.classList.contains('tv-night')).toBe(true);
  });

  it('auto-cycle rests on the chores screen while dim, and resumes when awake', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="tv-panel" class="hidden"></div>';
    let dim = false, t = 0;
    const c = createTvCycle({ panelHTML: () => '<p>x</p>', paused: () => dim, now: () => t });
    c.start();
    vi.advanceTimersByTime(30000); expect(c.current()).toBe(PANELS[1]);
    dim = true;
    vi.advanceTimersByTime(30000); expect(c.current()).toBe('chores');
    vi.advanceTimersByTime(90000); expect(c.current()).toBe('chores');
    dim = false;
    vi.advanceTimersByTime(30000); expect(c.current()).toBe(PANELS[1]);
    c.stop();
  });
});

describe('TV night mode is TV-only and writes nothing (#315)', () => {
  it('editing views (READONLY off) are never dimmed', () => {
    const body = document.createElement('body');
    expect(updateTvNight(at(23), body, false)).toBe(false);
    expect(body.classList.contains('tv-night')).toBe(false);
  });
  it('tv.js night code does not touch Firebase or storage', async () => {
    const src = (await import('node:fs')).readFileSync('src/tv.js', 'utf8');
    const night = src.slice(src.indexOf('export const NIGHT_START'), src.indexOf('let _cycle'));
    expect(night).not.toMatch(/firebase|localStorage|sessionStorage|patch|writeState/i);
  });
});

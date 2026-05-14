import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { esc, sha256, freqDays, daysSince, getWeekStart, taskPoints, dueStatus } from '../src/utils.js';

// Fixed test date: 2026-05-13 (Wednesday)
const FIXED_DATE = new Date('2026-05-13T12:00:00.000Z');

describe('esc', () => {
  it('escapes ampersand', () => {
    expect(esc('&')).toBe('&amp;');
  });
  it('escapes less-than', () => {
    expect(esc('<')).toBe('&lt;');
  });
  it('escapes greater-than', () => {
    expect(esc('>')).toBe('&gt;');
  });
  it('escapes double quotes', () => {
    expect(esc('"')).toBe('&quot;');
  });
  it("escapes single quotes", () => {
    expect(esc("'")).toBe('&#39;');
  });
  it('escapes a full XSS payload', () => {
    expect(esc('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });
  it('converts non-string numbers to escaped string', () => {
    expect(esc(42)).toBe('42');
  });
  it('converts null to string "null"', () => {
    expect(esc(null)).toBe('null');
  });
  it('leaves safe strings untouched', () => {
    expect(esc('Hello World')).toBe('Hello World');
  });
  it('handles empty string', () => {
    expect(esc('')).toBe('');
  });
  it('handles combined special characters', () => {
    expect(esc('a & b < c > d "e" \'f\'')).toBe(
      'a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;'
    );
  });
});

describe('sha256', () => {
  it('returns a 64-character hex string', async () => {
    const hash = await sha256('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
  it('produces the correct known hash for "1234"', async () => {
    const hash = await sha256('1234');
    expect(hash).toBe('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');
  });
  it('is deterministic — same input yields same hash', async () => {
    expect(await sha256('test')).toBe(await sha256('test'));
  });
  it('different inputs produce different hashes', async () => {
    expect(await sha256('abc')).not.toBe(await sha256('xyz'));
  });
  it('handles empty string', async () => {
    const hash = await sha256('');
    expect(hash).toHaveLength(64);
  });
});

describe('freqDays', () => {
  it('daily → 1', () => expect(freqDays('daily')).toBe(1));
  it('weekly → 7', () => expect(freqDays('weekly')).toBe(7));
  it('fortnightly → 14', () => expect(freqDays('fortnightly')).toBe(14));
  it('monthly → 30', () => expect(freqDays('monthly')).toBe(30));
  it('"once" defaults to 7 (not a recurring frequency)', () => {
    expect(freqDays('once')).toBe(7);
  });
  it('unknown string defaults to 7', () => {
    expect(freqDays('bogus')).toBe(7);
  });
  it('undefined defaults to 7', () => {
    expect(freqDays(undefined)).toBe(7);
  });
});

describe('daysSince', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns 0 when timestamp equals now', () => {
    vi.setSystemTime(FIXED_DATE);
    expect(daysSince(FIXED_DATE.getTime())).toBe(0);
  });
  it('returns 1 for exactly 24 hours ago', () => {
    vi.setSystemTime(FIXED_DATE);
    expect(daysSince(FIXED_DATE.getTime() - 86400000)).toBe(1);
  });
  it('floors partial days (1.5 days → 1)', () => {
    vi.setSystemTime(FIXED_DATE);
    expect(daysSince(FIXED_DATE.getTime() - 86400000 * 1.5)).toBe(1);
  });
  it('returns a large number for timestamp 0 (epoch)', () => {
    vi.setSystemTime(FIXED_DATE);
    expect(daysSince(0)).toBeGreaterThan(10000);
  });
});

describe('getWeekStart', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns a YYYY-MM-DD formatted string', () => {
    vi.setSystemTime(FIXED_DATE);
    expect(getWeekStart()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('returns the Monday of the current week (2026-05-13 → 2026-05-11)', () => {
    vi.setSystemTime(FIXED_DATE); // Wednesday 2026-05-13
    expect(getWeekStart()).toBe('2026-05-11');
  });
  it('returns same day when today is already Monday', () => {
    vi.setSystemTime(new Date('2026-05-11T00:00:00.000Z')); // Monday
    expect(getWeekStart()).toBe('2026-05-11');
  });
  it('returns prior Monday when today is Sunday', () => {
    vi.setSystemTime(new Date('2026-05-17T00:00:00.000Z')); // Sunday
    expect(getWeekStart()).toBe('2026-05-11');
  });
  it('result is always a Monday (getDay() === 1)', () => {
    vi.setSystemTime(FIXED_DATE);
    expect(new Date(getWeekStart()).getUTCDay()).toBe(1);
  });
});

describe('taskPoints', () => {
  it('daily easy → 1', () => expect(taskPoints({ freq: 'daily',       difficulty: 'easy'   })).toBe(1));
  it('weekly easy → 3', () => expect(taskPoints({ freq: 'weekly',     difficulty: 'easy'   })).toBe(3));
  it('fortnightly easy → 5', () => expect(taskPoints({ freq: 'fortnightly', difficulty: 'easy' })).toBe(5));
  it('monthly easy → 8', () => expect(taskPoints({ freq: 'monthly',   difficulty: 'easy'   })).toBe(8));
  it('once easy → 8', () => expect(taskPoints({ freq: 'once',         difficulty: 'easy'   })).toBe(8));
  it('weekly medium → 6 (3 × 2)', () => expect(taskPoints({ freq: 'weekly', difficulty: 'medium' })).toBe(6));
  it('weekly hard → 9 (3 × 3)', () => expect(taskPoints({ freq: 'weekly', difficulty: 'hard'   })).toBe(9));
  it('daily hard → 3 (1 × 3)', () => expect(taskPoints({ freq: 'daily',  difficulty: 'hard'   })).toBe(3));
  it('monthly hard → 24 (8 × 3)', () => expect(taskPoints({ freq: 'monthly', difficulty: 'hard' })).toBe(24));
  it('missing difficulty defaults to easy multiplier (×1)', () => {
    expect(taskPoints({ freq: 'weekly' })).toBe(3);
  });
  it('unknown freq defaults base to 1', () => {
    expect(taskPoints({ freq: 'unknown', difficulty: 'medium' })).toBe(2);
  });
});

describe('dueStatus', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns "done" for a task with done:true regardless of dates', () => {
    vi.setSystemTime(FIXED_DATE);
    expect(dueStatus({ done: true, freq: 'daily', lastDone: 0 })).toBe('done');
  });

  describe('once-off tasks', () => {
    it('returns "ok" when dueDate is absent', () => {
      vi.setSystemTime(FIXED_DATE);
      expect(dueStatus({ done: false, freq: 'once' })).toBe('ok');
    });
    it('returns "overdue" when dueDate is yesterday', () => {
      vi.setSystemTime(FIXED_DATE);
      expect(dueStatus({ done: false, freq: 'once', dueDate: '2026-05-12' })).toBe('overdue');
    });
    it('returns "soon" when dueDate is today', () => {
      vi.setSystemTime(FIXED_DATE);
      expect(dueStatus({ done: false, freq: 'once', dueDate: '2026-05-13' })).toBe('soon');
    });
    it('returns "soon" when dueDate is tomorrow', () => {
      vi.setSystemTime(FIXED_DATE);
      expect(dueStatus({ done: false, freq: 'once', dueDate: '2026-05-14' })).toBe('soon');
    });
    it('returns "ok" when dueDate is next week', () => {
      vi.setSystemTime(FIXED_DATE);
      expect(dueStatus({ done: false, freq: 'once', dueDate: '2026-05-20' })).toBe('ok');
    });
  });

  describe('recurring tasks', () => {
    it('returns "overdue" when never done (lastDone undefined)', () => {
      vi.setSystemTime(FIXED_DATE);
      expect(dueStatus({ done: false, freq: 'daily' })).toBe('overdue');
    });
    it('returns "overdue" when lastDone is 0 (epoch)', () => {
      vi.setSystemTime(FIXED_DATE);
      expect(dueStatus({ done: false, freq: 'daily', lastDone: 0 })).toBe('overdue');
    });
    it('returns "overdue" for daily task done 2+ days ago', () => {
      vi.setSystemTime(FIXED_DATE);
      expect(dueStatus({ done: false, freq: 'daily', lastDone: FIXED_DATE.getTime() - 2 * 86400000 })).toBe('overdue');
    });
    it('returns "soon" for daily task done exactly 0 days ago (due today)', () => {
      vi.setSystemTime(FIXED_DATE);
      // daysSince(now) = 0, freqDays('daily')=1, so d-1=0, 0>=0 → 'soon'
      expect(dueStatus({ done: false, freq: 'daily', lastDone: FIXED_DATE.getTime() })).toBe('soon');
    });
    it('returns "soon" for weekly task done 6 days ago (due tomorrow)', () => {
      vi.setSystemTime(FIXED_DATE);
      expect(dueStatus({ done: false, freq: 'weekly', lastDone: FIXED_DATE.getTime() - 6 * 86400000 })).toBe('soon');
    });
    it('returns "ok" for weekly task done 3 days ago', () => {
      vi.setSystemTime(FIXED_DATE);
      expect(dueStatus({ done: false, freq: 'weekly', lastDone: FIXED_DATE.getTime() - 3 * 86400000 })).toBe('ok');
    });
    it('returns "overdue" for monthly task done 31 days ago', () => {
      vi.setSystemTime(FIXED_DATE);
      expect(dueStatus({ done: false, freq: 'monthly', lastDone: FIXED_DATE.getTime() - 31 * 86400000 })).toBe('overdue');
    });
  });
});

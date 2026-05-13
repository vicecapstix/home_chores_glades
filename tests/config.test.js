import { describe, it, expect } from 'vitest';
import { FB_URL, PCOLS, CATEGORIES, BADGES, READONLY } from '../src/config.js';

describe('FB_URL', () => {
  it('is a non-empty string', () => {
    expect(typeof FB_URL).toBe('string');
    expect(FB_URL.length).toBeGreaterThan(0);
  });
  it('starts with https://', () => {
    expect(FB_URL).toMatch(/^https:\/\//);
  });
});

describe('PCOLS', () => {
  it('contains exactly 6 colour pairs', () => {
    expect(PCOLS).toHaveLength(6);
  });
  it('each entry has a bg and a text property', () => {
    PCOLS.forEach(c => {
      expect(c).toHaveProperty('bg');
      expect(c).toHaveProperty('text');
    });
  });
  it('bg and text values look like CSS hex colours', () => {
    PCOLS.forEach(c => {
      expect(c.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(c.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('CATEGORIES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(CATEGORIES)).toBe(true);
    expect(CATEGORIES.length).toBeGreaterThan(0);
  });
  it('contains only strings', () => {
    CATEGORIES.forEach(c => expect(typeof c).toBe('string'));
  });
  it('includes expected household areas', () => {
    expect(CATEGORIES).toContain('Kitchen');
    expect(CATEGORIES).toContain('Bathroom');
    expect(CATEGORIES).toContain('Bedroom');
  });
});

describe('BADGES', () => {
  it('has exactly 4 badge definitions', () => {
    expect(BADGES).toHaveLength(4);
  });
  it('each badge has id, label, icon, and check function', () => {
    BADGES.forEach(b => {
      expect(typeof b.id).toBe('string');
      expect(typeof b.label).toBe('string');
      expect(typeof b.icon).toBe('string');
      expect(typeof b.check).toBe('function');
    });
  });

  describe('"first" badge (completedCount >= 1)', () => {
    const badge = () => BADGES.find(b => b.id === 'first');
    it('is not earned at 0 completions', () => {
      expect(badge().check({ completedCount: 0 })).toBe(false);
    });
    it('is earned at 1 completion', () => {
      expect(badge().check({ completedCount: 1 })).toBe(true);
    });
    it('handles missing completedCount (defaults to 0)', () => {
      expect(badge().check({})).toBe(false);
    });
  });

  describe('"century" badge (completedCount >= 100)', () => {
    const badge = () => BADGES.find(b => b.id === 'century');
    it('is not earned at 99 completions', () => {
      expect(badge().check({ completedCount: 99 })).toBe(false);
    });
    it('is earned at exactly 100 completions', () => {
      expect(badge().check({ completedCount: 100 })).toBe(true);
    });
    it('is earned above 100 completions', () => {
      expect(badge().check({ completedCount: 200 })).toBe(true);
    });
  });

  describe('"on_fire" badge (streak >= 7)', () => {
    const badge = () => BADGES.find(b => b.id === 'on_fire');
    it('is not earned at streak 6', () => {
      expect(badge().check({ streak: 6 })).toBe(false);
    });
    it('is earned at streak 7', () => {
      expect(badge().check({ streak: 7 })).toBe(true);
    });
    it('handles missing streak (defaults to 0)', () => {
      expect(badge().check({})).toBe(false);
    });
  });

  describe('"dedicated" badge (streak >= 30)', () => {
    const badge = () => BADGES.find(b => b.id === 'dedicated');
    it('is not earned at streak 29', () => {
      expect(badge().check({ streak: 29 })).toBe(false);
    });
    it('is earned at streak 30', () => {
      expect(badge().check({ streak: 30 })).toBe(true);
    });
  });
});

describe('READONLY', () => {
  it('is false in the test environment (no ?readonly=1 in URL)', () => {
    expect(READONLY).toBe(false);
  });
});

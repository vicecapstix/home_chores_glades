import { describe, it, expect, beforeEach } from 'vitest';
import { state, getMembers, applySnapshot, migrateLegacyMembers } from '../src/state.js';

// Reset state before each test to prevent cross-test pollution
beforeEach(() => {
  state.members   = {};
  state.tasks     = {};
  state.history   = [];
  state.nextId    = 1;
  state.templates = {};
});

describe('getMembers', () => {
  it('returns empty array when there are no members', () => {
    expect(getMembers()).toEqual([]);
  });
  it('returns the name of a single member', () => {
    state.members = { Alice: { name: 'Alice' } };
    expect(getMembers()).toEqual(['Alice']);
  });
  it('returns all member names in insertion order', () => {
    state.members = {
      Alice: { name: 'Alice' },
      Bob:   { name: 'Bob'   },
      Carol: { name: 'Carol' },
    };
    expect(getMembers()).toEqual(['Alice', 'Bob', 'Carol']);
  });
});

describe('applySnapshot', () => {
  it('applies all fields from a full snapshot', () => {
    const snap = {
      members:   { Alice: { name: 'Alice', role: 'admin' } },
      tasks:     { t1: { id: 't1', name: 'Dishes' } },
      history:   [{ taskId: 't1', person: 'Alice', completedAt: 1000 }],
      nextId:    7,
      templates: { tpl1: { id: 'tpl1', name: 'Morning' } },
    };
    applySnapshot(snap);
    expect(state.members).toEqual(snap.members);
    expect(state.tasks).toEqual(snap.tasks);
    expect(state.history).toEqual(snap.history);
    expect(state.nextId).toBe(7);
    expect(state.templates).toEqual(snap.templates);
  });
  it('uses empty defaults when snapshot has no fields', () => {
    applySnapshot({});
    expect(state.members).toEqual({});
    expect(state.tasks).toEqual({});
    expect(state.history).toEqual([]);
    expect(state.nextId).toBe(1);
    expect(state.templates).toEqual({});
  });
  it('treats null fields the same as missing fields', () => {
    applySnapshot({ members: null, tasks: null, history: null, nextId: null, templates: null });
    expect(state.members).toEqual({});
    expect(state.tasks).toEqual({});
    expect(state.history).toEqual([]);
    expect(state.nextId).toBe(1);
    expect(state.templates).toEqual({});
  });
  it('mutates the shared state object in place', () => {
    const originalRef = state;
    applySnapshot({ nextId: 99 });
    expect(state).toBe(originalRef);
    expect(state.nextId).toBe(99);
  });
});

describe('migrateLegacyMembers', () => {
  it('returns {} for null input', () => {
    expect(migrateLegacyMembers(null)).toEqual({});
  });
  it('returns {} for undefined input', () => {
    expect(migrateLegacyMembers(undefined)).toEqual({});
  });

  describe('legacy array format', () => {
    it('converts ["Alice", "Bob"] to object keyed by name', () => {
      const result = migrateLegacyMembers(['Alice', 'Bob']);
      expect(result).toHaveProperty('Alice');
      expect(result).toHaveProperty('Bob');
    });
    it('first entry in array gets role "admin"', () => {
      const result = migrateLegacyMembers(['Alice', 'Bob']);
      expect(result.Alice.role).toBe('admin');
    });
    it('subsequent entries get role "member"', () => {
      const result = migrateLegacyMembers(['Alice', 'Bob', 'Carol']);
      expect(result.Bob.role).toBe('member');
      expect(result.Carol.role).toBe('member');
    });
    it('fills all required default fields', () => {
      const result = migrateLegacyMembers(['Alice']);
      expect(result.Alice).toMatchObject({
        name:           'Alice',
        role:           'admin',
        pinHash:        '',
        points:         0,
        streak:         0,
        lastStreakDate: null,
        badges:         [],
        completedCount: 0,
        weekPoints:     0,
        weekStart:      null,
      });
    });
    it('skips falsy entries (empty string, null)', () => {
      const result = migrateLegacyMembers(['Alice', '', null, 'Bob']);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty('Alice');
      expect(result).toHaveProperty('Bob');
    });
  });

  describe('object format (modern)', () => {
    it('passes through existing fields without modification', () => {
      const raw = { Alice: { name: 'Alice', role: 'admin', points: 50, completedCount: 10 } };
      const result = migrateLegacyMembers(raw);
      expect(result.Alice.points).toBe(50);
      expect(result.Alice.completedCount).toBe(10);
    });
    it('fills missing fields with defaults', () => {
      const raw = { Alice: { name: 'Alice' } };
      const result = migrateLegacyMembers(raw);
      expect(result.Alice.points).toBe(0);
      expect(result.Alice.streak).toBe(0);
      expect(result.Alice.badges).toEqual([]);
      expect(result.Alice.pinHash).toBe('');
    });
    it('assigns "admin" role to first member when role is absent', () => {
      const raw = {
        Alice: { name: 'Alice' },
        Bob:   { name: 'Bob'   },
      };
      const result = migrateLegacyMembers(raw);
      expect(result.Alice.role).toBe('admin');
    });
    it('does not override an existing role', () => {
      const raw = { Alice: { name: 'Alice', role: 'member' } };
      const result = migrateLegacyMembers(raw);
      expect(result.Alice.role).toBe('member');
    });
    it('skips entries that are null or have no name', () => {
      const raw = {
        Alice:   { name: 'Alice' },
        bad:     null,
        alsobad: { role: 'member' }, // missing name
      };
      const result = migrateLegacyMembers(raw);
      expect(Object.keys(result)).toHaveLength(1);
      expect(result).toHaveProperty('Alice');
    });
  });
});

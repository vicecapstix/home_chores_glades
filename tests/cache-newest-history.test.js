import { describe, it, expect } from 'vitest';
import { trimSnapshot, saveSnapshot, loadSnapshot, HISTORY_LIMIT } from '../src/cache.js';

const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; } }; };
const hist = n => Array.from({ length: n }, (_, i) => ({ taskId: i, completedAt: i }));
const base = history => ({ members: {}, tasks: {}, history, nextId: 1 });

describe('cached history keeps the newest entries (history is oldest-first)', () => {
  it('a 500-entry history caches the last 50, in order', () => {
    const out = trimSnapshot(base(hist(500))).history;
    expect(out).toHaveLength(HISTORY_LIMIT);
    expect(out[0].taskId).toBe(450);
    expect(out[out.length - 1].taskId).toBe(499);
    expect(out.map(e => e.taskId)).toEqual(Array.from({ length: 50 }, (_, i) => 450 + i));
  });
  it('a short history is kept whole', () => {
    expect(trimSnapshot(base(hist(7))).history.map(e => e.taskId)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(trimSnapshot(base([])).history).toEqual([]);
    expect(trimSnapshot({ members: {}, tasks: {} }).history).toEqual([]);
  });
  it('round-trips through save/load with the newest entries', () => {
    const st = mem();
    expect(saveSnapshot(base(hist(500)), st)).toBe(true);
    const h = loadSnapshot(st).history;
    expect(h[0].taskId).toBe(450);
    expect(h[49].taskId).toBe(499);
  });
});

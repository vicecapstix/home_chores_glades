import { describe, it, expect } from 'vitest';
import { icsFold } from '../src/weekics.js';

// #349: RFC 5545 folds at 75 octets, never inside a multi-byte character.
const bytes = s => new TextEncoder().encode(s).length;
const unfold = s => s.replace(/\r\n /g, '');
const physical = s => s.split('\r\n');

describe('icsFold folds by UTF-8 octets (#349)', () => {
  const cases = {
    'emoji name': 'SUMMARY:' + '🧹Sweep the whole kitchen floor 🍽️ and wipe the counters 🧽 '.repeat(3),
    'accented name': 'SUMMARY:' + 'Ménage de la cuisine et des chambres à coucher é'.repeat(4),
    'emoji exactly at the boundary': 'SUMMARY:' + 'a'.repeat(66) + '😀😀😀',
    'CJK name': 'SUMMARY:' + '打扫厨房和客厅的地板'.repeat(8),
  };
  for (const [label, line] of Object.entries(cases)) {
    it(label + ': every physical line is <= 75 octets and unfolds exactly', () => {
      const out = icsFold(line);
      for (const p of physical(out)) expect(bytes(p)).toBeLessThanOrEqual(75);
      expect(unfold(out)).toBe(line);
    });
    it(label + ': no lone surrogate or replacement char', () => {
      for (const p of physical(icsFold(line))) {
        expect(p).not.toContain('�');
        expect(p).toBe(p.toWellFormed());
      }
    });
  }

  it('leaves short and ASCII-only lines unchanged in shape', () => {
    expect(icsFold('SUMMARY:Bins')).toBe('SUMMARY:Bins');
    const ascii = 'SUMMARY:' + 'x'.repeat(200);
    const out = icsFold(ascii);
    const lines = physical(out);
    expect(lines[0].length).toBe(75);
    expect(lines.slice(1, -1).every(l => l.length === 75)).toBe(true);
    expect(unfold(out)).toBe(ascii);
  });
});

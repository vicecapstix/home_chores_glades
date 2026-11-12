import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { exportCSV } from '../src/ui.js';
import { buildBackup } from '../src/backup.js';

beforeEach(() => {
  state.tasks = {}; state.history = [];
  state.members = { Kid: { name: 'Kid', points: 9, pinHash: 'x', payouts: { p1: { at: new Date(2026, 9, 16, 7, 5).getTime(), by: 'Mum', points: 9 } } } };
});

const csvOf = href => decodeURIComponent(href.replace('data:text/csv;charset=utf-8,', '')).split('\n');

describe('payouts in exports (criterion 4)', () => {
  it('CSV export includes payout rows within the date range', () => {
    let href = '';
    const orig = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(tag => { const el = orig(tag); if (tag === 'a') el.click = () => { href = el.href; }; return el; });
    exportCSV('2026-10-16', '2026-10-16');
    expect(csvOf(href)[1]).toBe('2026-10-16,07:05,Kid,Payout by Mum,,,9');
    exportCSV('2026-10-17', '');
    expect(csvOf(href)).toHaveLength(2); // header + trailing empty
  });
  it('JSON backup carries payouts but not PINs', () => {
    const b = buildBackup(state);
    expect(Object.values(b.members.Kid.payouts)[0].points).toBe(9);
    expect(b.members.Kid.pinHash).toBeUndefined();
  });
});

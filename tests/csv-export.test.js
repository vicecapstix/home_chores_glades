import { describe, it, expect, beforeEach, vi } from 'vitest';

let UI, state;
beforeEach(async () => {
  vi.resetModules();
  state = (await import('../src/state.js')).state;
  UI = await import('../src/ui.js');
});

describe('csvField (#91)', () => {
  it('prefixes formula-leading characters with a single quote', () => {
    for (const c of ['=', '+', '-', '@', '\t', '\r']) {
      const out = UI.csvField(c + 'x');
      expect(out.replace(/^"|"$/g, '').startsWith("'" + c)).toBe(true);
    }
  });
  it('quotes fields with comma, quote, CR or LF', () => {
    expect(UI.csvField('a,b')).toBe('"a,b"');
    expect(UI.csvField('say "hi"')).toBe('"say ""hi"""');
    expect(UI.csvField('a\nb')).toBe('"a\nb"');
    expect(UI.csvField('a\rb')).toBe('"a\rb"');
  });
  it('leaves plain text and numbers alone', () => {
    expect(UI.csvField('Dishes')).toBe('Dishes');
    expect(UI.csvField(3)).toBe('3');
    expect(UI.csvField(-2)).toBe('-2');
  });
});

describe('exportCSV (#91)', () => {
  it('writes local YYYY-MM-DD date, HH:MM time, and neutralises formulas', () => {
    const ts = new Date(2026, 9, 16, 7, 5, 0).getTime();
    state.tasks = { t1: { id: 't1', freq: 'daily', difficulty: 'easy' } };
    state.history = [{ taskId: 't1', taskName: '=HYPERLINK("x")', person: 'Al', completedAt: ts, points: 2 }];
    let href = '';
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(tag => {
      const el = origCreate(tag);
      if (tag === 'a') { el.click = () => { href = el.href; }; }
      return el;
    });
    UI.exportCSV('', '');
    const csv = decodeURIComponent(href.replace('data:text/csv;charset=utf-8,', ''));
    const [head, row] = csv.split('\n');
    expect(head).toBe('date,time,person,task,frequency,difficulty,points');
    expect(row).toBe('2026-10-16,07:05,Al,"\'=HYPERLINK(""x"")",daily,easy,2');
  });
});

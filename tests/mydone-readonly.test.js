import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/config.js', () => ({ READONLY: true }));
import { renderMyDone } from '../src/mydone.js';

describe('own "all done" banner on the readonly TV (#317)', () => {
  it('never shows', () => {
    document.body.innerHTML = '<div id="my-done" class="hidden"><span id="my-done-text"></span></div>';
    const NOW = new Date(2026, 9, 14, 12).getTime();
    const t = done => ({ a: { id: 'a', name: 'A', freq: 'daily', person: 'Bo', done, lastDone: NOW - 1000 } });
    renderMyDone(t(false), 'Bo', () => false, NOW); renderMyDone(t(true), 'Bo', () => false, NOW);
    expect(document.getElementById('my-done').classList.contains('hidden')).toBe(true);
  });
});

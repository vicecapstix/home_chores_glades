import { describe, it, expect, beforeEach } from 'vitest';
import { renderMyDone, _resetMyDone } from '../src/mydone.js';

const NOW = new Date(2026, 9, 14, 12, 0, 0).getTime();
const mk = (id, person, done, at = NOW) => ({ id, name: 'C' + id, freq: 'daily', person, done, lastDone: done ? at - 1000 : at - 36 * 3600000 });
const member = () => false, admin = () => true;
const banner = () => document.getElementById('my-done');

beforeEach(() => {
  localStorage.clear(); _resetMyDone();
  document.body.innerHTML = '<div id="my-done" class="hidden"><span id="my-done-text"></span></div>';
});

describe('own "all done" banner (#317)', () => {
  it('shows when the member ticks their last chore due today', () => {
    renderMyDone({ a: mk('a', 'Bo', true), b: mk('b', 'Bo', false) }, 'Bo', member, NOW);
    expect(banner().classList.contains('hidden')).toBe(true);
    renderMyDone({ a: mk('a', 'Bo', true), b: mk('b', 'Bo', true) }, 'Bo', member, NOW);
    expect(banner().classList.contains('hidden')).toBe(false);
    expect(document.getElementById('my-done-text').textContent).toContain('Bo');
  });
  it('shows once per day on this device', () => {
    const open = { a: mk('a', 'Bo', false) }, shut = { a: mk('a', 'Bo', true) };
    renderMyDone(open, 'Bo', member, NOW); renderMyDone(shut, 'Bo', member, NOW);
    banner().classList.add('hidden'); // dismissed
    renderMyDone(open, 'Bo', member, NOW); renderMyDone(shut, 'Bo', member, NOW);
    expect(banner().classList.contains('hidden')).toBe(true);
    const T2 = NOW + 86400000; // next day
    renderMyDone({ a: mk('a', 'Bo', false, T2) }, 'Bo', member, T2); renderMyDone({ a: mk('a', 'Bo', true, T2) }, 'Bo', member, T2);
    expect(banner().classList.contains('hidden')).toBe(false);
  });
  it('does not fire on first load when everything is already done', () => {
    renderMyDone({ a: mk('a', 'Bo', true) }, 'Bo', member, NOW);
    expect(banner().classList.contains('hidden')).toBe(true);
  });
  it('ignores other members\' chores and unassigned ones', () => {
    renderMyDone({ a: mk('a', 'Bo', false), x: mk('x', 'Cy', false), y: mk('y', '', false) }, 'Bo', member, NOW);
    renderMyDone({ a: mk('a', 'Bo', true), x: mk('x', 'Cy', false), y: mk('y', '', false) }, 'Bo', member, NOW);
    expect(banner().classList.contains('hidden')).toBe(false);
  });
  it('never shows for admins', () => {
    renderMyDone({ a: mk('a', 'Amy', false) }, 'Amy', admin, NOW);
    renderMyDone({ a: mk('a', 'Amy', true) }, 'Amy', admin, NOW);
    expect(banner().classList.contains('hidden')).toBe(true);
  });
  it('hides again if a chore is unticked', () => {
    renderMyDone({ a: mk('a', 'Bo', false) }, 'Bo', member, NOW);
    renderMyDone({ a: mk('a', 'Bo', true) }, 'Bo', member, NOW);
    renderMyDone({ a: mk('a', 'Bo', false) }, 'Bo', member, NOW);
    expect(banner().classList.contains('hidden')).toBe(true);
  });
  it('still shows when localStorage is blocked', () => {
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('blocked'); };
    try {
      renderMyDone({ a: mk('a', 'Bo', false) }, 'Bo', member, NOW);
      renderMyDone({ a: mk('a', 'Bo', true) }, 'Bo', member, NOW);
      expect(banner().classList.contains('hidden')).toBe(false);
    } finally { Storage.prototype.getItem = orig; }
  });
  it('reduced-motion CSS disables the animation and READONLY hides it', async () => {
    const css = (await import('node:fs')).readFileSync('src/style.css', 'utf8');
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.my-done \{ animation: none/);
    expect(css).toMatch(/body\[data-readonly\] \.my-done \{ display: none/);
  });
});

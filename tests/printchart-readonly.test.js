import { it, expect, vi } from 'vitest';
vi.mock('../src/config.js', () => ({ READONLY: true }));
import { printChart } from '../src/printchart.js';

it('READONLY (TV) never prints, even for admin (#182)', () => {
  document.body.innerHTML = '<div id="print-chart"></div>';
  window.print = vi.fn();
  printChart(() => true);
  expect(window.print).not.toHaveBeenCalled();
});

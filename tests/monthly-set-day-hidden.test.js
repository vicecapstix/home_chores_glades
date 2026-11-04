// #255 review fix: the "On day" select must be hidden unless Monthly is chosen.
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/style.css', 'utf8');

it('style.css hides #new-monthday and .edit-monthday when .hidden', () => {
  const rule = css.split('}').find(r => r.includes('.edit-monthday.hidden'));
  expect(rule).toBeTruthy();
  expect(rule).toContain('#new-monthday.hidden');
  expect(rule).toMatch(/display:\s*none/);
});

it('with the stylesheet applied, a hidden monthday select is display:none and a visible one is not', () => {
  document.head.innerHTML = '<style>' + css + '</style>';
  document.body.innerHTML = '<select id="new-monthday" class="hidden"></select><select class="edit-monthday"></select>';
  expect(getComputedStyle(document.getElementById('new-monthday')).display).toBe('none');
  expect(getComputedStyle(document.querySelector('.edit-monthday')).display).not.toBe('none');
  document.getElementById('new-monthday').classList.remove('hidden');
  expect(getComputedStyle(document.getElementById('new-monthday')).display).not.toBe('none');
});

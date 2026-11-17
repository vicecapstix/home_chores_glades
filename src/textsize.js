// Text size setting (#356): Normal -> Large -> Extra large, scaling every rem-based size through a
// root class. Device-local only (localStorage 'fc_textsize', nothing in Firebase). The TV can set it
// without a tap via ?text=large (or xl) in the URL; that value is applied but not stored.

const KEY = 'fc_textsize';
const ORDER = ['normal', 'large', 'xl'];
const LABEL = { normal: 'Normal', large: 'Large', xl: 'Extra large' };
const GLYPH = { normal: 'A', large: 'A+', xl: 'A++' };
const URL_VALUES = { normal: 'normal', large: 'large', xl: 'xl', xlarge: 'xl', extralarge: 'xl' };

let current = 'normal';

export const nextTextSize = s => ORDER[(ORDER.indexOf(s) + 1) % ORDER.length];

export function storedTextSize() {
  let v = null;
  try { v = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  return ORDER.includes(v) ? v : 'normal';
}

export function urlTextSize(search = location.search) {
  const v = String(new URLSearchParams(search).get('text') || '').toLowerCase().replace(/[-_ ]/g, '');
  return URL_VALUES[v] || null;
}

export const getTextSize = () => current;

export function applyTextSize(size = current) {
  current = ORDER.includes(size) ? size : 'normal';
  const cl = document.documentElement.classList;
  cl.toggle('ts-large', current === 'large');
  cl.toggle('ts-xl', current === 'xl');
  const btn = document.getElementById('textsize-btn');
  if (btn) {
    btn.textContent = GLYPH[current];
    const text = 'Text size: ' + LABEL[current] + '. Tap for ' + LABEL[nextTextSize(current)];
    btn.title = text;
    btn.setAttribute('aria-label', text);
  }
  return current;
}

export function cycleTextSize() {
  const next = nextTextSize(current);
  try { localStorage.setItem(KEY, next); } catch (e) { /* storage blocked */ }
  return applyTextSize(next);
}

export function initTextSize(search = location.search) {
  return applyTextSize(urlTextSize(search) || storedTextSize());
}

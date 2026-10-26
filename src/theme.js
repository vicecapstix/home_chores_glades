// Theme setting: Auto (follow the device) -> Light -> Dark. Stored per device in
// localStorage 'fc_theme' ('light' | 'dark' | 'auto'; a missing/unknown value means Auto,
// so older saved 'light'/'dark' choices keep working).

const KEY = 'fc_theme';
const ORDER = ['auto', 'light', 'dark'];
const ICON = { auto: '🌓', light: '☀️', dark: '🌙' };
const LABEL = { auto: 'Auto', light: 'Light', dark: 'Dark' };
const META = { light: '#2D6A4F', dark: '#1A1A18' };

export function getThemeSetting() {
  let v = null;
  try { v = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  return v === 'light' || v === 'dark' ? v : 'auto';
}

function systemDark() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(setting, prefersDark) {
  return setting === 'dark' || (setting !== 'light' && prefersDark) ? 'dark' : 'light';
}

export function nextThemeSetting(setting) {
  return ORDER[(ORDER.indexOf(setting) + 1) % ORDER.length];
}

export function applyTheme() {
  const setting = getThemeSetting();
  const theme = resolveTheme(setting, systemDark());
  const html = document.documentElement;
  if (theme === 'dark') html.setAttribute('data-theme', 'dark');
  else html.removeAttribute('data-theme');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', META[theme]);
  const btn = document.getElementById('theme-btn');
  if (btn) {
    btn.textContent = ICON[setting];
    const text = 'Theme: ' + LABEL[setting] + '. Tap for ' + LABEL[nextThemeSetting(setting)];
    btn.title = text;
    btn.setAttribute('aria-label', text);
  }
  return theme;
}

export function cycleTheme() {
  const next = nextThemeSetting(getThemeSetting());
  try { localStorage.setItem(KEY, next); } catch (e) { /* storage blocked */ }
  return { setting: next, theme: applyTheme() };
}

// Apply now and re-apply when the device switches (only matters in Auto).
export function initTheme() {
  applyTheme();
  if (typeof window.matchMedia !== 'function') return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => { if (getThemeSetting() === 'auto') applyTheme(); };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
}

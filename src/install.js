// "Install app" button + iOS "Add to Home Screen" hint (#178). Client only; no services.
import { READONLY } from './config.js';

const HINT_KEY = 'fc_ios_hint';
let deferred = null;
let installed = false;

export function isStandalone(win = globalThis.window) {
  if (!win) return false;
  try {
    if (win.matchMedia && win.matchMedia('(display-mode: standalone)').matches) return true;
  } catch (e) { /* ignore */ }
  return !!(win.navigator && win.navigator.standalone);
}

export function isIosSafari(nav = globalThis.navigator) {
  if (!nav) return false;
  const ua = nav.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function hintDismissed() {
  try { return localStorage.getItem(HINT_KEY) === '1'; } catch (e) { return false; }
}

// Pure visibility logic: which install affordance (if any) to show.
export function installUI({ readonly, standalone, hasPrompt, ios, dismissed }) {
  const off = readonly || standalone;
  return {
    showButton: !off && !!hasPrompt,
    showIosHint: !off && !hasPrompt && !!ios && !dismissed,
  };
}

export function updateInstallUI() {
  const ui = installUI({
    readonly: READONLY, standalone: installed || isStandalone(), hasPrompt: !!deferred,
    ios: isIosSafari(), dismissed: hintDismissed(),
  });
  document.getElementById('btn-install')?.classList.toggle('hidden', !ui.showButton);
  document.getElementById('ios-install-hint')?.classList.toggle('hidden', !ui.showIosHint);
  return ui;
}

export async function installApp() {
  if (READONLY || !deferred) return;
  const ev = deferred;
  deferred = null;
  try {
    await ev.prompt();
    await ev.userChoice;
  } catch (e) { /* user cancelled or browser refused */ }
  updateInstallUI();
}

export function dismissIosHint() {
  try { localStorage.setItem(HINT_KEY, '1'); } catch (e) { /* blocked */ }
  updateInstallUI();
}

export function initInstall() {
  if (READONLY) return;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    updateInstallUI();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    updateInstallUI();
  });
  updateInstallUI();
}

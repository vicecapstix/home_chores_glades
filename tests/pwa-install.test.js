import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../src/firebase.js', () => ({
  initFirebase: vi.fn(), getDb: vi.fn(), initAuth: vi.fn(), writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(),
  patchRoot: vi.fn(), patchPaths: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(), onValue: vi.fn(), ref: vi.fn(),
}));

import { installUI, isIosSafari, isStandalone, initInstall, installApp, dismissIosHint, hintDismissed, updateInstallUI } from '../src/install.js';
import { viewFromSearch } from '../src/utils.js';
import { state } from '../src/state.js';
import { render, initRender } from '../src/render.js';

const src = f => readFileSync(resolve(__dirname, '../src', f), 'utf8');

describe('install button / hint visibility logic (#178)', () => {
  const base = { readonly: false, standalone: false, hasPrompt: false, ios: false, dismissed: false };
  it('shows the button only when a prompt is available and not installed/TV', () => {
    expect(installUI({ ...base, hasPrompt: true }).showButton).toBe(true);
    expect(installUI(base).showButton).toBe(false);
    expect(installUI({ ...base, hasPrompt: true, standalone: true }).showButton).toBe(false);
    expect(installUI({ ...base, hasPrompt: true, readonly: true }).showButton).toBe(false);
  });
  it('shows the iOS hint once: not after dismissal, standalone, TV or when a prompt exists', () => {
    expect(installUI({ ...base, ios: true }).showIosHint).toBe(true);
    expect(installUI({ ...base, ios: true, dismissed: true }).showIosHint).toBe(false);
    expect(installUI({ ...base, ios: true, standalone: true }).showIosHint).toBe(false);
    expect(installUI({ ...base, ios: true, readonly: true }).showIosHint).toBe(false);
    expect(installUI({ ...base, ios: true, hasPrompt: true }).showIosHint).toBe(false);
    expect(installUI({ ...base, ios: false }).showIosHint).toBe(false);
  });
  it('detects iOS Safari and standalone mode', () => {
    const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
    expect(isIosSafari({ userAgent: safari })).toBe(true);
    expect(isIosSafari({ userAgent: safari.replace('Version/17.0', 'CriOS/120') })).toBe(false);
    expect(isIosSafari({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36' })).toBe(false);
    expect(isStandalone({ matchMedia: () => ({ matches: true }), navigator: {} })).toBe(true);
    expect(isStandalone({ matchMedia: () => ({ matches: false }), navigator: { standalone: true } })).toBe(true);
    expect(isStandalone({ matchMedia: () => ({ matches: false }), navigator: {} })).toBe(false);
  });
});

describe('install wiring (#178)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = vi.fn(() => ({ matches: false }));
    document.body.innerHTML = '<button id="btn-install" class="hidden"></button><div id="ios-install-hint" class="hidden"></div>';
  });
  it('captures beforeinstallprompt, shows the button, prompt() on click, hides after', async () => {
    initInstall();
    const prompt = vi.fn().mockResolvedValue();
    const ev = new Event('beforeinstallprompt', { cancelable: true });
    ev.prompt = prompt; ev.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.getElementById('btn-install').classList.contains('hidden')).toBe(false);
    await installApp();
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(document.getElementById('btn-install').classList.contains('hidden')).toBe(true);
  });
  it('hides the button on appinstalled', () => {
    const ev = new Event('beforeinstallprompt', { cancelable: true });
    ev.prompt = vi.fn(); ev.userChoice = Promise.resolve({});
    window.dispatchEvent(ev);
    expect(document.getElementById('btn-install').classList.contains('hidden')).toBe(false);
    window.dispatchEvent(new Event('appinstalled'));
    expect(document.getElementById('btn-install').classList.contains('hidden')).toBe(true);
  });
  it('dismissing the iOS hint is remembered in localStorage', () => {
    expect(hintDismissed()).toBe(false);
    dismissIosHint();
    expect(localStorage.getItem('fc_ios_hint')).toBe('1');
    expect(hintDismissed()).toBe(true);
    expect(updateInstallUI().showIosHint).toBe(false);
  });
  it('index.html has the button and hint, hidden by default', () => {
    const html = src('index.html');
    expect(html).toMatch(/id="btn-install"[^>]*>/);
    expect(html).toMatch(/class="theme-toggle hidden" id="btn-install"/);
    expect(html).toMatch(/id="ios-install-hint" class="hidden"/);
  });
});

describe('manifest shortcuts (#178)', () => {
  const m = JSON.parse(src('public/manifest.webmanifest'));
  it('has My chores and TV view shortcuts', () => {
    expect(m.shortcuts.map(s => [s.name, s.url])).toEqual([
      ['My chores', './?view=mine'],
      ['TV view', './?readonly=1'],
    ]);
  });
  it('shortcut icons exist in the manifest icon set', () => {
    m.shortcuts.forEach(s => s.icons.forEach(i => expect(m.icons.some(x => x.src === i.src)).toBe(true)));
  });
});

describe('?view=mine (#178)', () => {
  it('viewFromSearch only accepts mine', () => {
    expect(viewFromSearch('?view=mine')).toBe('mine');
    expect(viewFromSearch('?readonly=1&view=mine')).toBe('mine');
    expect(viewFromSearch('?view=all')).toBe('');
    expect(viewFromSearch('')).toBe('');
    expect(viewFromSearch(undefined)).toBe('');
  });
  it('selects the Mine filter on first render for a signed-in member', () => {
    window.matchMedia = vi.fn(() => ({ matches: false })); // not a phone: only the URL param can pick Mine
    window.history.replaceState({}, '', '/?view=mine');
    document.body.innerHTML = ['h-total', 'h-done', 'h-overdue', 'h-pct'].map(i => '<span id="' + i + '"></span>').join('') +
      '<div id="prog"></div><div id="member-chips"></div><select id="new-person"></select><div id="filters"></div><div id="task-list"></div>';
    state.members = { Ann: { name: 'Ann', role: 'member' } };
    state.tasks = { t1: { id: 't1', name: 'Mine', freq: 'daily', person: 'Ann', done: false, lastDone: Date.now() } };
    initRender(() => false, () => 'Ann');
    render();
    expect(document.querySelector('.filter-pill.active').textContent).toMatch(/^Mine/);
    window.history.replaceState({}, '', '/');
  });
});

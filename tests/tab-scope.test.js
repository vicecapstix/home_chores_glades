import { describe, it, expect, beforeEach, vi } from 'vitest';

let ui, H, state;
beforeEach(async () => {
  vi.resetModules();
  state = (await import('../src/state.js')).state;
  ui = await import('../src/ui.js');
  H = await import('../src/history.js');
  state.members = { Alice: { name: 'Alice', role: 'admin' }, Bob: { name: 'Bob', role: 'member' } };
  state.history = [];
  document.body.innerHTML =
    '<div id="leaderboard-modal" class="hidden"><div id="lb-list"></div>' +
    '<button class="lb-tab active" id="l1"></button><button class="lb-tab" id="l2"></button></div>' +
    '<div id="stats-modal" class="hidden"><div id="stats-list"></div>' +
    '<button class="lb-tab active" id="s1"></button><button class="lb-tab" id="s2"></button></div>' +
    '<div id="history-modal" class="hidden"><div id="history-filters"></div><div id="history-list"></div></div>';
});

describe('tab scoping', () => {
  it('setLbTab only touches leaderboard tabs', () => {
    ui.setLbTab('week', document.getElementById('l2'));
    expect(document.getElementById('l1').classList.contains('active')).toBe(false);
    expect(document.getElementById('l2').classList.contains('active')).toBe(true);
    expect(document.getElementById('s1').classList.contains('active')).toBe(true);
  });
  it('setStatsTab only touches stats tabs', () => {
    ui.setStatsTab('month', document.getElementById('s2'));
    expect(document.getElementById('s1').classList.contains('active')).toBe(false);
    expect(document.getElementById('s2').classList.contains('active')).toBe(true);
    expect(document.getElementById('l1').classList.contains('active')).toBe(true);
  });
  it('setLbTab leaves history pills active', () => {
    H.renderHistory();
    ui.setLbTab('week', document.getElementById('l2'));
    expect(document.querySelector('#history-filters .active')).not.toBeNull();
  });
});

describe('history filter click', () => {
  const click = (el) => H.historyFilterClick({ target: el });
  it('ignores a click on the gap (container)', () => {
    H.renderHistory();
    click(document.querySelector('[data-member="Bob"]'));
    click(document.getElementById('history-filters'));
    expect(document.querySelector('#history-filters .active').dataset.member).toBe('Bob');
  });
  it('applies a pill click, including nested children', () => {
    H.renderHistory();
    const child = document.createElement('span');
    document.querySelector('[data-member="Alice"]').appendChild(child);
    click(child);
    expect(document.querySelector('#history-filters .active').dataset.member).toBe('Alice');
  });
  it('Everyone pill still resets', () => {
    H.renderHistory();
    click(document.querySelector('[data-member="Bob"]'));
    click(document.querySelector('[data-member=""]'));
    expect(document.querySelector('#history-filters .active').dataset.member).toBe('');
  });
  it('index.html wires the container to historyFilterClick', async () => {
    const { readFileSync } = await import('node:fs');
    const html = readFileSync('src/index.html', 'utf8');
    expect(html).toContain('window.historyFilterClick(event)');
    expect(html).not.toContain('event.target.dataset.member');
  });
});

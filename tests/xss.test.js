import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/firebase.js', () => ({
  initFirebase: vi.fn(), getDb: vi.fn(), initAuth: vi.fn(), writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(),
  patchRoot: vi.fn(), removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn(), onValue: vi.fn(), ref: vi.fn(),
}));

import { esc } from '../src/utils.js';
import * as utils from '../src/utils.js';
import { state } from '../src/state.js';
import { cardHTML } from '../src/render.js';
import { showMemberSelector } from '../src/auth.js';

const EVIL = ["O'Brien", "');alert(1);('", '"><img src=x onerror=alert(1)>', "a\\b\nc"];

// Run an inline handler string against a stub window and return the recorded call args
function runHandler(code, fnNames) {
  const calls = [];
  const win = {};
  fnNames.forEach(n => { win[n] = (...a) => calls.push([n, ...a]); });
  new Function('window', 'event', code)(win, { stopPropagation() {}, key: '' });
  return calls;
}

describe('jsq', () => {
  it('is exported and round-trips through a JS string literal', () => {
    expect(typeof utils.jsq).toBe('function');
    EVIL.concat(['José', '日本', '😀']).forEach(s => {
      expect(new Function("return '" + utils.jsq(s) + "'")()).toBe(s);
    });
  });
  it('never emits characters that can break an HTML attribute or JS string', () => {
    EVIL.forEach(s => expect(utils.jsq(s)).toMatch(/^[A-Za-z0-9 _\-\\]*$/));
  });
});

describe('login buttons', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="pin-member-sub"></div><div id="pin-member-name"></div><div id="pin-member-pin"></div><div id="pin-member-chips"></div>';
  });
  it("a member named O'Brien gets a working login button", () => {
    state.members = { "O'Brien": { name: "O'Brien", role: 'member' } };
    showMemberSelector(() => {});
    const btn = document.querySelector('#pin-member-chips button');
    expect(runHandler(btn.getAttribute('onclick'), ['memberSelect'])).toEqual([['memberSelect', "O'Brien"]]);
  });
  it('hostile names produce no extra elements or calls', () => {
    state.members = Object.fromEntries(EVIL.map(n => [n, { name: n, role: 'member' }]));
    showMemberSelector(() => {});
    const btns = document.querySelectorAll('#pin-member-chips button');
    expect(btns).toHaveLength(EVIL.length);
    expect(document.querySelector('#pin-member-chips img')).toBeNull();
    btns.forEach((b, i) => expect(runHandler(b.getAttribute('onclick'), ['memberSelect'])).toEqual([['memberSelect', EVIL[i]]]));
  });
});

describe('task cards escape DB-sourced values', () => {
  it('ids, freq and difficulty cannot inject markup or JS', () => {
    state.members = {};
    const t = { id: "t1');alert(1);('", name: 'x', freq: '"><img src=x onerror=alert(1)>', difficulty: '"><svg onload=alert(1)>',
      person: '', done: false, subtasks: { s1: { id: "s'1", name: 'sub', done: false } } };
    const wrap = document.createElement('div');
    wrap.innerHTML = cardHTML(t);
    expect(wrap.querySelector('img, svg[onload]')).toBeNull();
    wrap.querySelectorAll('[onclick]').forEach(el => {
      const calls = runHandler(el.getAttribute('onclick'), ['claimTask', 'toggleTask', 'editTask', 'deleteTask', 'toggleSubtasks', 'toggleSubtask', 'removeSubtask', 'addSubtask', 'toggleSelect']);
      calls.forEach(c => expect(c[1]).toBe("t1');alert(1);('"));
    });
    expect(wrap.querySelector('[data-id]').getAttribute('data-id')).toBe(t.id);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { addMember } from '../src/members.js';

vi.mock('../src/firebase.js', () => ({
  writeState:  vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
import { writeState } from '../src/firebase.js';
import { showToast } from '../src/ui.js';

const isAdmin = () => true;

async function tryAdd(name) {
  document.getElementById('new-member').value = name;
  await addMember(isAdmin);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.members = {};
  state.tasks = {};
  document.body.innerHTML = '<input id="new-member" value="" />';
});

describe('addMember name validation (#35)', () => {
  for (const ch of ['.', '#', '$', '[', ']', '/']) {
    it('rejects a name containing ' + ch, async () => {
      await tryAdd('Al' + ch + 'ice');
      expect(state.members).toEqual({});
      expect(writeState).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalled();
      expect(document.getElementById('new-member').value).toBe('Al' + ch + 'ice');
    });
  }
  it('rejects names longer than 30 characters', async () => {
    await tryAdd('x'.repeat(31));
    expect(state.members).toEqual({});
    expect(showToast).toHaveBeenCalled();
  });
  it('accepts a 30-character name and ordinary punctuation', async () => {
    await tryAdd('x'.repeat(30));
    await tryAdd("Mary-Ann O'Neil");
    expect(Object.keys(state.members)).toHaveLength(2);
  });
  it('ignores empty / whitespace silently', async () => {
    await tryAdd('   ');
    expect(state.members).toEqual({});
    expect(showToast).not.toHaveBeenCalled();
  });
});

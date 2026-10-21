import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import { rotationTag } from '../src/utils.js';
import { cardHTML } from '../src/render.js';

vi.mock('../src/firebase.js', () => ({ writeState: vi.fn(), patchTask: vi.fn(), patchMember: vi.fn(), patchRoot: vi.fn() }));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn(), pColor: vi.fn(() => null) }));

const MEM = ['Ann', 'Bo', 'Cy'];

describe('rotationTag (#124)', () => {
  it('shows who is next on reset, with wrap-around', () => {
    expect(rotationTag({ freq: 'daily', person: 'Ann', rotation: ['Ann', 'Bo', 'Cy'] }, MEM)).toContain('next: Bo');
    expect(rotationTag({ freq: 'daily', person: 'Cy', rotation: ['Ann', 'Bo', 'Cy'] }, MEM)).toContain('next: Ann');
  });
  it('skips removed members like the reset does', () => {
    expect(rotationTag({ freq: 'weekly', person: 'Ann', rotation: ['Ann', 'Gone', 'Cy'] }, MEM)).toContain('next: Cy');
  });
  it('is empty without a valid rotation of 2+ current members, and for one-off chores', () => {
    expect(rotationTag({ freq: 'daily', person: 'Ann' }, MEM)).toBe('');
    expect(rotationTag({ freq: 'daily', person: 'Ann', rotation: ['Ann', 'Gone'] }, MEM)).toBe('');
    expect(rotationTag({ freq: 'once', person: 'Ann', rotation: ['Ann', 'Bo'] }, MEM)).toBe('');
  });
  it('escapes names', () => {
    expect(rotationTag({ freq: 'daily', person: 'Ann', rotation: ['Ann', '<b>x</b>'] }, ['Ann', '<b>x</b>'])).not.toContain('<b>x</b>');
  });
});

describe('cardHTML shows the rotation tag', () => {
  beforeEach(() => { state.members = { Ann: { name: 'Ann' }, Bo: { name: 'Bo' } }; state.tasks = {}; });
  const base = { id: 't1', name: 'Dishes', freq: 'daily', person: 'Ann', done: false, lastDone: 0, subtasks: {} };
  it('includes the tag for rotating chores only', () => {
    expect(cardHTML({ ...base, rotation: ['Ann', 'Bo'] })).toContain('🔁 next: Bo');
    expect(cardHTML(base)).not.toContain('🔁');
  });
});

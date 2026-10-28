import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from '../src/state.js';

vi.mock('../src/firebase.js', () => ({
  writeState: vi.fn().mockResolvedValue(undefined), patchTask: vi.fn().mockResolvedValue(undefined),
  patchMember: vi.fn().mockResolvedValue(undefined), patchRoot: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn(), restoreTask: vi.fn(), patchSubtask: vi.fn().mockResolvedValue(undefined),
  adjustMemberPoints: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));
vi.mock('../src/undo.js', () => ({ pushUndo: vi.fn() }));
import { patchTask, adjustMemberPoints } from '../src/firebase.js';
import { showToast } from '../src/ui.js';
import { toggleTask, claimTask } from '../src/tasks.js';
import { cardHTML } from '../src/render.js';

const admin = () => true, notAdmin = () => false;
const as = name => () => name;

beforeEach(() => {
  vi.clearAllMocks();
  state.members = {
    Alice: { name: 'Alice', role: 'admin', points: 5 }, Bob: { name: 'Bob', role: 'member', points: 5 },
    Cy: { name: 'Cy', role: 'member', points: 0 },
  };
  state.tasks = {
    any: { id: 'any', name: 'Bins', freq: 'daily', person: '', done: true, lastDone: Date.now(), lastDoneBy: 'Bob', lastDonePoints: 3 },
    open: { id: 'open', name: 'Open', freq: 'daily', person: '', done: false, lastDone: 0 },
  };
});

describe('done chores cannot be claimed (#246)', () => {
  it('shows no Claim button on a done chore, but does on an open one', () => {
    expect(cardHTML(state.tasks.any)).not.toContain('window.claimTask');
    expect(cardHTML(state.tasks.open)).toContain('window.claimTask');
  });
  it('claimTask refuses a done chore with a toast and no write', async () => {
    await claimTask('any', as('Cy'));
    expect(patchTask).not.toHaveBeenCalled();
    expect(state.tasks.any.person).toBe('');
    expect(showToast).toHaveBeenCalled();
  });
  it('claimTask still works on an open chore', async () => {
    await claimTask('open', as('Cy'));
    expect(patchTask).toHaveBeenCalledWith('open', { person: 'Cy' });
  });
});

describe("uncheck is tied to the completer, whatever person is (#246)", () => {
  it("blocks a non-admin whose name is now on someone else's completion", async () => {
    state.tasks.any.person = 'Cy';
    await toggleTask('any', as('Cy'), notAdmin);
    expect(adjustMemberPoints).not.toHaveBeenCalled();
    expect(patchTask).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });
  it('lets the completer and an admin uncheck', async () => {
    state.tasks.any.person = 'Cy';
    await toggleTask('any', as('Bob'), notAdmin);
    expect(patchTask).toHaveBeenCalledWith('any', expect.objectContaining({ done: false }));
    state.tasks.any.done = true;
    patchTask.mockClear();
    await toggleTask('any', as('Alice'), admin);
    expect(patchTask).toHaveBeenCalledWith('any', expect.objectContaining({ done: false }));
  });
});

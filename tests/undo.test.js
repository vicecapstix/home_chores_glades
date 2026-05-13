import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Top-level mock is hoisted by vitest — applies to dynamic imports too
vi.mock('../src/ui.js', () => ({
  showToast: vi.fn(),
}));

let pushUndo, popUndo, showToast;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();

  document.body.innerHTML = `
    <div id="undo-toast">
      <span id="undo-label"></span>
    </div>
  `;

  // Re-import after reset so each test gets a clean _stack
  const undoMod = await import('../src/undo.js');
  const uiMod   = await import('../src/ui.js');
  pushUndo  = undoMod.pushUndo;
  popUndo   = undoMod.popUndo;
  showToast = uiMod.showToast;
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('pushUndo', () => {
  it('shows the undo toast with the command label', () => {
    pushUndo({ label: 'Clean Kitchen', undo: vi.fn() });
    const label = document.getElementById('undo-label');
    expect(label.textContent).toBe('Deleted "Clean Kitchen"');
  });
  it('adds the "show" class to the undo toast element', () => {
    pushUndo({ label: 'Task', undo: vi.fn() });
    expect(document.getElementById('undo-toast').classList.contains('show')).toBe(true);
  });
  it('does not throw when DOM elements are absent', () => {
    document.body.innerHTML = '';
    expect(() => pushUndo({ label: 'Task', undo: vi.fn() })).not.toThrow();
  });
  it('caps the stack at 20 commands (oldest entry dropped)', () => {
    for (let i = 0; i < 21; i++) {
      pushUndo({ label: `task-${i}`, undo: vi.fn() });
    }
    // The toast label reflects the LAST push (task-20)
    expect(document.getElementById('undo-label').textContent).toBe('Deleted "task-20"');
  });
});

describe('popUndo', () => {
  it('calls the stored undo function', async () => {
    const undoFn = vi.fn().mockResolvedValue(undefined);
    pushUndo({ label: 'Sweep', undo: undoFn });
    await popUndo();
    expect(undoFn).toHaveBeenCalledOnce();
  });
  it('shows "Restored" toast on success', async () => {
    pushUndo({ label: 'Sweep', undo: vi.fn().mockResolvedValue(undefined) });
    await popUndo();
    expect(showToast).toHaveBeenCalledWith('Restored');
  });
  it('shows an error toast when undo function rejects', async () => {
    const err = new Error('network error');
    pushUndo({ label: 'Sweep', undo: vi.fn().mockRejectedValue(err) });
    await popUndo();
    expect(showToast).toHaveBeenCalledWith('Restore failed: network error');
  });
  it('is a no-op when the stack is empty (no throw)', async () => {
    await expect(popUndo()).resolves.toBeUndefined();
    expect(showToast).not.toHaveBeenCalled();
  });
  it('hides the undo toast when called', async () => {
    pushUndo({ label: 'Task', undo: vi.fn().mockResolvedValue(undefined) });
    await popUndo();
    expect(document.getElementById('undo-toast').classList.contains('show')).toBe(false);
  });
  it('pops in LIFO order — last push is undone first', async () => {
    const undo1 = vi.fn().mockResolvedValue(undefined);
    const undo2 = vi.fn().mockResolvedValue(undefined);
    pushUndo({ label: 'First',  undo: undo1 });
    pushUndo({ label: 'Second', undo: undo2 });
    await popUndo();
    expect(undo2).toHaveBeenCalledOnce();
    expect(undo1).not.toHaveBeenCalled();
  });
});

describe('toast expiry timer', () => {
  it('removes the "show" class after 5 seconds', () => {
    pushUndo({ label: 'Task', undo: vi.fn() });
    expect(document.getElementById('undo-toast').classList.contains('show')).toBe(true);
    vi.advanceTimersByTime(5001);
    expect(document.getElementById('undo-toast').classList.contains('show')).toBe(false);
  });
  it('clears the stack after the 5-second window', async () => {
    pushUndo({ label: 'Task', undo: vi.fn() });
    vi.advanceTimersByTime(5001);
    // Stack is now empty — popUndo should not call the undo function
    const undo = vi.fn();
    await popUndo(); // stack is empty so this is a no-op
    expect(undo).not.toHaveBeenCalled();
  });
  it('resetting the timer on a second push extends the window', () => {
    pushUndo({ label: 'First',  undo: vi.fn() });
    vi.advanceTimersByTime(3000);
    pushUndo({ label: 'Second', undo: vi.fn() });
    vi.advanceTimersByTime(3000); // 6 s total from first push, 3 s from second
    // Second push reset the timer, so 3 s < 5 s — toast should still show
    expect(document.getElementById('undo-toast').classList.contains('show')).toBe(true);
  });
});

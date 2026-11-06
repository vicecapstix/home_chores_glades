import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/ui.js', () => ({ showToast: vi.fn() }));

let pushUndo, popUndo;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  document.body.innerHTML =
    '<div id="undo-toast"><span id="undo-label"></span><button type="button" id="undo-btn" disabled>Undo</button></div>';
  ({ pushUndo, popUndo } = await import('../src/undo.js'));
});
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

const btn = () => document.getElementById('undo-btn');

describe('stale undo entries (#276)', () => {
  it('after one Undo, an older entry cannot be undone later', async () => {
    const a = vi.fn().mockResolvedValue(); const b = vi.fn().mockResolvedValue();
    pushUndo({ label: 'A', undo: a });
    pushUndo({ label: 'B', undo: b });
    await popUndo();
    expect(b).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(60 * 60 * 1000);
    await popUndo();
    expect(a).not.toHaveBeenCalled();
  });
  it('two quick deletes + Undo inside the window still restores the latest', async () => {
    const a = vi.fn().mockResolvedValue(); const b = vi.fn().mockResolvedValue();
    pushUndo({ label: 'A', undo: a });
    vi.advanceTimersByTime(2000);
    pushUndo({ label: 'B', undo: b });
    await popUndo();
    expect(b).toHaveBeenCalledOnce();
    expect(a).not.toHaveBeenCalled();
  });
  it('the Undo button is enabled while shown and disabled once hidden by expiry', () => {
    pushUndo({ label: 'A', undo: vi.fn() });
    expect(btn().disabled).toBe(false);
    vi.advanceTimersByTime(5001);
    expect(btn().disabled).toBe(true);
  });
  it('the Undo button is disabled after clicking Undo', async () => {
    pushUndo({ label: 'A', undo: vi.fn().mockResolvedValue() });
    await popUndo();
    expect(btn().disabled).toBe(true);
  });
});
describe('markup', () => {
  it('index.html ships the Undo button disabled', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');
    expect(html).toMatch(/<button[^>]*id="undo-btn"[^>]*disabled/);
  });
});

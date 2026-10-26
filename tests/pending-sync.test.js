import { describe, it, expect, vi, beforeEach } from 'vitest';

let updateImpl;
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn(), onAuthStateChanged: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn((_d, p) => p), set: vi.fn(), remove: vi.fn(),
  update: (...a) => updateImpl(...a), onValue: vi.fn(), runTransaction: vi.fn(),
}));

let fb, pending, conn;
const tick = () => new Promise(r => setTimeout(r, 0));
beforeEach(async () => {
  vi.resetModules();
  pending = await import('../src/pending.js');
  fb = await import('../src/firebase.js');
  conn = await import('../src/connection.js');
  conn._resetForTests();
  fb.initFirebase();
  document.body.innerHTML = '<div id="offline-banner" class="hidden"></div><div class="live-dot"></div>';
});

describe('pending task writes (#144)', () => {
  it('shows not-synced while the write is unresolved and clears on resolve', async () => {
    let done; updateImpl = () => new Promise(r => { done = r; });
    const p = fb.patchTask('t1', { done: true });
    await tick();
    expect(pending.syncState('t1')).toBe('pending');
    const html = pending.syncTagHTML('t1');
    expect(html).toContain('not synced');
    expect(html).toContain('aria-label="Not synced yet"');
    done(); await p;
    expect(pending.syncState('t1')).toBe('');
    expect(pending.syncTagHTML('t1')).toBe('');
  });

  it('becomes a retry tag on failure and still rejects so the caller toasts', async () => {
    updateImpl = () => Promise.reject(new Error('PERMISSION_DENIED'));
    await expect(fb.patchTask('t1', { done: true })).rejects.toThrow('PERMISSION_DENIED');
    expect(pending.syncState('t1')).toBe('failed');
    const html = pending.syncTagHTML('t1');
    expect(html).toContain('not saved');
    expect(html).toContain("window.retrySync('t1')");
    expect(html).toContain('aria-label="Not saved. Tap to retry"');
  });

  it('retry reruns the same write and clears the tag on success', async () => {
    updateImpl = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined);
    await fb.patchTask('t1', { done: true }).catch(() => {});
    expect(await pending.retrySync('t1')).toBe(true);
    expect(updateImpl).toHaveBeenCalledTimes(2);
    expect(updateImpl.mock.calls[1]).toEqual(updateImpl.mock.calls[0]);
    expect(pending.syncState('t1')).toBe('');
  });

  it('tracks subtask writes against the parent task and counts pending', async () => {
    const dones = []; updateImpl = () => new Promise(r => dones.push(r));
    const a = fb.patchTask('t1', { done: true });
    const b = fb.patchSubtask('t2', 's1', { done: true });
    await tick();
    expect(pending.pendingCount()).toBe(2);
    expect(pending.syncState('t2')).toBe('pending');
    dones.forEach(d => d()); await Promise.all([a, b]);
    expect(pending.pendingCount()).toBe(0);
  });

  it('notifies a change handler with the count', async () => {
    const seen = []; pending.setPendingHandler(n => seen.push(n));
    updateImpl = () => Promise.resolve();
    await fb.patchTask('t1', {});
    expect(seen).toEqual([1, 0]);
  });

  it('keeps tracking in memory only (nothing in localStorage)', async () => {
    updateImpl = () => new Promise(() => {});
    fb.patchTask('t1', {});
    await tick();
    expect(localStorage.length).toBe(0);
  });

  it('escapes the id in the retry handler', async () => {
    updateImpl = () => Promise.reject(new Error('x'));
    await fb.patchTask("t'1", {}).catch(() => {});
    expect(pending.syncTagHTML("t'1")).not.toContain("retrySync('t'1')");
  });
});

describe('offline banner shows waiting changes', () => {
  it('shows N changes only while offline and N > 0', () => {
    const b = document.getElementById('offline-banner');
    conn.setConnection(true);
    conn.setPendingCount(2);
    conn.setConnection(false);
    expect(b.textContent).toContain('2 changes waiting');
    conn.setPendingCount(1);
    expect(b.textContent).toContain('1 change waiting');
    conn.setPendingCount(0);
    expect(b.textContent).toBe('Offline — changes will sync when you reconnect');
    conn.setPendingCount(3);
    conn.setConnection(true);
    expect(b.classList.contains('hidden')).toBe(true);
    expect(b.textContent).not.toContain('waiting');
  });
});

import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/config.js', async (orig) => ({ ...(await orig()), READONLY: true }));
vi.mock('../src/modals.js', () => ({ openModal: vi.fn() }));
import { openModal } from '../src/modals.js';
import { openDataSize } from '../src/datasize.js';

describe('data size is hidden on the readonly TV (#353)', () => {
  it('READONLY never opens it, even for an admin', () => {
    document.body.innerHTML = '<div id="datasize-list"></div>';
    openDataSize(() => true);
    expect(openModal).not.toHaveBeenCalled();
    expect(document.getElementById('datasize-list').innerHTML).toBe('');
  });
});

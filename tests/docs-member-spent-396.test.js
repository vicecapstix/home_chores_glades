import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const claude = readFileSync(resolve(__dirname, '..', 'CLAUDE.md'), 'utf8');

describe('CLAUDE.md member data shape lists spent (#396)', () => {
  const shape = claude.slice(claude.indexOf('### Member data shape'), claude.indexOf('### Legacy member migration'));
  it('has a spent field with a description', () => {
    expect(shape).toMatch(/^\s*spent,\s+\/\/\s+\S+/m);
  });
  it('lists every member field the code writes (spent, payouts, goalRewardId, awayUntil)', () => {
    for (const f of ['spent', 'payouts', 'goalRewardId', 'awayUntil', 'awaySince']) expect(shape).toContain(f + ',');
  });
});

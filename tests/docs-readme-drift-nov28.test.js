import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = f => readFileSync(resolve(__dirname, '..', f), 'utf8');
const features = root('README.md').split('## Features')[1].split('\n## ')[0];
const line = key => features.split('\n').find(l => l.startsWith('- **' + key));

describe('README lists features merged in November (#426)', () => {
  it('has a Birthday line (month and day, banner)', () => {
    const l = line('Birthday');
    expect(l).toBeTruthy();
    expect(l).toMatch(/banner/i);
  });
  it('has a Chore streak line', () => {
    const l = line('Chore streak');
    expect(l).toBeTruthy();
    expect(l).toContain('in a row');
  });
  it('has a Parent cheer line', () => {
    const l = line('Parent cheer');
    expect(l).toBeTruthy();
    expect(l).toContain('👏');
  });
  it('has a Quiet hours line (21:00-07:00, this device)', () => {
    const l = line('Quiet hours');
    expect(l).toBeTruthy();
    expect(l).toContain('21:00');
  });
  it('has a Copy chore line', () => {
    const l = line('Copy a chore');
    expect(l).toBeTruthy();
  });
  it('has a Reward note line', () => {
    const l = line('Reward note');
    expect(l).toBeTruthy();
    expect(l).toContain('60');
  });
  it('CLAUDE.md redemptions shape lists the optional note', () => {
    const l = root('CLAUDE.md').split('\n').find(x => x.trim().startsWith('redemptions:'));
    expect(l).toContain('note?');
  });
});

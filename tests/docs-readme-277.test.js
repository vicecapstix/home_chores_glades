import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readme = readFileSync(resolve(__dirname, '..', 'README.md'), 'utf8');
const features = readme.split('## Features')[1].split('\n## ')[0];
const line = key => features.split('\n').find(l => l.startsWith('- **' + key));

describe('README lists features merged 1 Nov (#277)', () => {
  it('has a Parent check line with the Looks good / Not yet wording', () => {
    const l = line('Parent check');
    expect(l).toBeTruthy();
    expect(l).toContain('Looks good');
    expect(l).toContain('Not yet');
  });
  it('has an Extra jobs line (member logs, parent approves points)', () => {
    const l = line('Extra jobs');
    expect(l).toBeTruthy();
    expect(l).toMatch(/approve/i);
  });
  it('has a Double-points day line', () => {
    const l = line('Double-points day');
    expect(l).toBeTruthy();
    expect(l).toMatch(/x2|×2/i);
  });
  it('has a Fairness report line (admin, last 4 weeks)', () => {
    const l = line('Fairness report');
    expect(l).toBeTruthy();
    expect(l).toMatch(/4 weeks/);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readme = readFileSync(resolve(__dirname, '..', 'README.md'), 'utf8');
const features = readme.split('## Features')[1].split('\n## ')[0];
const line = key => features.split('\n').find(l => l.startsWith('- **' + key));

describe('README lists time of day and Switch off until (#305)', () => {
  it('has a Time of day line naming the three labels', () => {
    const l = line('Time of day');
    expect(l).toBeTruthy();
    for (const s of ['Morning', 'After school', 'Evening']) expect(l).toContain(s);
  });
  it('has a Switch off until line (seasonal, never due until the date)', () => {
    const l = line('Switch off until');
    expect(l).toBeTruthy();
    expect(l).toMatch(/season/i);
    expect(l).toMatch(/never due|not due/i);
  });
});

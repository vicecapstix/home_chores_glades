import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readme = readFileSync(resolve(__dirname, '..', 'README.md'), 'utf8');
const features = readme.split('## Features')[1].split('\n## ')[0];
const line = key => features.split('\n').find(l => l.startsWith('- **' + key));

describe('README lists recent features (#385)', () => {
  it('Bonus chore: extra points on one chore for one day', () => {
    const l = line('Bonus chore'); expect(l).toBeTruthy(); expect(l).toMatch(/today|one day|that day/i); expect(l).toMatch(/extra points/i);
  });
  it('Reward stock: limited copies', () => {
    const l = line('Reward stock'); expect(l).toBeTruthy(); expect(l).toMatch(/sold out/i);
  });
  it('Chore minutes: display only estimate', () => {
    const l = line('Chore minutes'); expect(l).toBeTruthy(); expect(l).toMatch(/180/); expect(l).toMatch(/never change points|display only/i);
  });
  it('Text size: Normal, Large, Extra large', () => {
    const l = line('Text size'); expect(l).toBeTruthy(); for (const s of ['Normal', 'Large', 'Extra large']) expect(l).toContain(s);
  });
  it('Chore search', () => {
    const l = line('Chore search'); expect(l).toBeTruthy(); expect(l).toMatch(/search/i);
  });
  it('TV Tomorrow panel from 18:00', () => {
    const l = line('TV tomorrow'); expect(l).toBeTruthy(); expect(l).toContain('18:00');
  });
  it('Backup reminder after 30 days', () => {
    const l = line('Backup reminder'); expect(l).toBeTruthy(); expect(l).toContain('30 days');
  });
  it('Data size readout', () => {
    const l = line('Data size'); expect(l).toBeTruthy(); expect(l).toMatch(/Spark/);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');

describe('README feature list covers shipped features (#344)', () => {
  it('mentions pocket money', () => expect(readme).toMatch(/pocket money/i));
  it('mentions chore swaps', () => expect(readme).toMatch(/swap/i));
  it('mentions the calendar (.ics) download', () => expect(readme).toMatch(/\.ics/));
});

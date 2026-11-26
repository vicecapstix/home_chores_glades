import { describe, it, expect } from 'vitest';
import { validRate } from '../src/pocketmoney.js';

describe('validRate amount formats (#394)', () => {
  it.each(['.5', '0.5', '5', '.05', '5.25', ' .5 '])('accepts %s', a => {
    expect(validRate(10, a)).not.toBeNull();
  });
  it.each(['.555', '-1', '0', '.0', '1001', '', 'abc', '.', '1.234'])('rejects %s', a => {
    expect(validRate(10, a)).toBeNull();
  });
  it('stores the amount as a number (0.5)', () => {
    expect(validRate(10, '.5')).toEqual({ pts: 10, amount: 0.5 });
    expect(typeof validRate('10', '.5').amount).toBe('number');
  });
});

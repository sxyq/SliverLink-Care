import { describe, expect, it } from 'vitest';
import { isNotEmpty, isValidPhone } from './validation';

describe('volunteer validation utilities', () => {
  it('validates mainland mobile numbers', () => {
    expect(isValidPhone('13812345678')).toBe(true);
    expect(isValidPhone('12812345678')).toBe(false);
    expect(isValidPhone('1381234567')).toBe(false);
  });

  it('checks trimmed non-empty values', () => {
    expect(isNotEmpty(' 张三 ')).toBe(true);
    expect(isNotEmpty('   ')).toBe(false);
  });
});

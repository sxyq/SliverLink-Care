import { describe, expect, it } from 'vitest';
import { calculateBMI } from './bmi';

describe('calculateBMI', () => {
  it('calculates bmi from height and weight strings', () => {
    expect(calculateBMI('170', '65')).toBe('22.5');
  });

  it('returns empty string for missing or zero values', () => {
    expect(calculateBMI('', '65')).toBe('');
    expect(calculateBMI('170', '')).toBe('');
    expect(calculateBMI('0', '65')).toBe('');
  });
});

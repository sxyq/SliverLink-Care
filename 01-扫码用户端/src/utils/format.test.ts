import { describe, expect, it } from 'vitest';
import { formatBMI, formatDate } from './format';

describe('format utilities', () => {
  it('formats valid, invalid, and empty dates', () => {
    expect(formatDate('2026-05-25T12:00:00Z')).toBe('2026-05-25');
    expect(formatDate('not-a-date')).toBe('not-a-date');
    expect(formatDate('')).toBe('-');
  });

  it('formats bmi values with one decimal', () => {
    expect(formatBMI(23)).toBe('23.0');
    expect(formatBMI(23.26)).toBe('23.3');
    expect(formatBMI(null as unknown as number)).toBe('-');
  });
});

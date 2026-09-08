import { describe, expect, test } from 'bun:test';
import { formatCompactCount } from './format-compact-count';

describe('formatCompactCount', () => {
  test('keeps small integers as-is', () => {
    expect(formatCompactCount(0)).toBe('0');
    expect(formatCompactCount(192)).toBe('192');
    expect(formatCompactCount(999)).toBe('999');
  });

  test('uses one decimal K above 1_000', () => {
    expect(formatCompactCount(1_000)).toBe('1.0K');
    expect(formatCompactCount(432_000)).toBe('432.0K');
    expect(formatCompactCount(120_500)).toBe('120.5K');
  });

  test('uses two decimal M above 1_000_000', () => {
    expect(formatCompactCount(1_000_000)).toBe('1.00M');
    expect(formatCompactCount(1_250_000)).toBe('1.25M');
  });

  test('rounds before scaling', () => {
    expect(formatCompactCount(1_234)).toBe('1.2K');
    expect(formatCompactCount(1_999)).toBe('2.0K');
  });
});

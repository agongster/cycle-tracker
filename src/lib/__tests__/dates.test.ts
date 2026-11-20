import { describe, expect, it } from '@jest/globals';

import { addDays, diffDays, formatShort, monthGrid } from '../dates';

describe('dates', () => {
  it('counts whole days across daylight-saving changes', () => {
    expect(diffDays('2026-03-09', '2026-03-07')).toBe(2); // US clocks spring forward Mar 8
    expect(diffDays('2026-11-02', '2026-10-31')).toBe(2); // and fall back Nov 1
  });

  it.each([
    ['2026-12-31', 1, '2027-01-01'],
    ['2024-02-28', 1, '2024-02-29'], // leap year
    ['2025-02-28', 1, '2025-03-01'], // not a leap year
    ['2026-03-01', -1, '2026-02-28'],
  ])('addDays(%s, %i) is %s', (from, n, expected) => {
    expect(addDays(from, n)).toBe(expected);
  });

  it('builds a Sunday-first month grid', () => {
    const grid = monthGrid({ year: 2026, month: 11 }); // December 2026 starts on a Tuesday
    expect(grid[0]).toEqual([null, null, '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05']);
    expect(grid.flat().filter(Boolean)).toHaveLength(31);
  });

  it('formats short dates', () => {
    expect(formatShort('2026-12-03')).toBe('Dec 3');
  });
});

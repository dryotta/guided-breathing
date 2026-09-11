import { describe, expect, it } from 'vitest';
import { formatClock } from './dom';

describe('formatClock', () => {
  it('formats remaining time as mm:ss', () => {
    expect(formatClock(600_000)).toBe('10:00');
    expect(formatClock(585_000)).toBe('09:45');
    expect(formatClock(61_000)).toBe('01:01');
    expect(formatClock(0)).toBe('00:00');
  });

  it('rounds up so the last second is visible for a full second', () => {
    expect(formatClock(9_001)).toBe('00:10');
    expect(formatClock(9_000)).toBe('00:09');
    expect(formatClock(1)).toBe('00:01');
  });

  it('clamps negative input', () => {
    expect(formatClock(-5_000)).toBe('00:00');
  });
});

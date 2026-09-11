import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  buildCycle,
  cycleDurationMs,
  getLevel,
  inhaleProgress,
  sampleCycle,
  sharpInhaleMs,
} from './pattern';

describe('levels', () => {
  it('matches the advertised inhale/exhale seconds', () => {
    expect(LEVELS.map((level) => [level.inhaleMs / 1000, level.exhaleMs / 1000])).toEqual([
      [3, 7],
      [5, 10],
      [10, 20],
      [20, 40],
      [30, 60],
    ]);
  });

  it('throws on an unknown level id', () => {
    // @ts-expect-error deliberately invalid at the type level
    expect(() => getLevel('nope')).toThrow();
  });
});

describe('buildCycle', () => {
  it('keeps the advertised totals exact for every level', () => {
    for (const level of LEVELS) {
      const phases = buildCycle(level);
      expect(cycleDurationMs(phases)).toBe(level.inhaleMs + level.exhaleMs);

      const [first, second, third] = phases;
      expect(first?.id).toBe('inhale');
      expect(second?.id).toBe('sharpInhale');
      expect(third?.id).toBe('exhale');
      expect((first?.durationMs ?? 0) + (second?.durationMs ?? 0)).toBe(level.inhaleMs);
      expect(third?.durationMs).toBe(level.exhaleMs);
    }
  });

  it('keeps the second inhale short and always shorter than the first', () => {
    for (const level of LEVELS) {
      const phases = buildCycle(level);
      const first = phases[0];
      const second = phases[1];
      expect(second?.durationMs).toBeLessThanOrEqual(3_000);
      expect(second?.durationMs).toBeGreaterThanOrEqual(600);
      expect(second?.durationMs ?? 0).toBeLessThan(first?.durationMs ?? 0);
    }
  });

  it('clamps the sharp inhale at both ends', () => {
    expect(sharpInhaleMs(1_000)).toBe(600);
    expect(sharpInhaleMs(10_000)).toBe(3_000);
    expect(sharpInhaleMs(100_000)).toBe(3_000);
  });
});

describe('sampleCycle', () => {
  const phases = buildCycle(getLevel('relax')); // 2.1s + 0.9s + 7s = 10s

  it('resolves each phase by absolute elapsed time', () => {
    expect(sampleCycle(phases, 0).phase.id).toBe('inhale');
    expect(sampleCycle(phases, 2_000).phase.id).toBe('inhale');
    expect(sampleCycle(phases, 2_500).phase.id).toBe('sharpInhale');
    expect(sampleCycle(phases, 5_000).phase.id).toBe('exhale');
    expect(sampleCycle(phases, 9_999).phase.id).toBe('exhale');
  });

  it('wraps cleanly into later cycles without drift', () => {
    const cycle = cycleDurationMs(phases);
    const early = sampleCycle(phases, 1_000);
    const late = sampleCycle(phases, 1_000 + cycle * 89);

    expect(late.phase.id).toBe(early.phase.id);
    expect(late.expansion).toBeCloseTo(early.expansion, 10);
    expect(late.cycleIndex).toBe(89);
    expect(early.cycleIndex).toBe(0);
  });

  it('runs expansion from empty to full and back within a cycle', () => {
    expect(sampleCycle(phases, 0).expansion).toBeCloseTo(0, 6);
    // End of the sharp inhale is the peak.
    expect(sampleCycle(phases, 2_999).expansion).toBeGreaterThan(0.99);
    // End of the exhale returns to empty.
    expect(sampleCycle(phases, 9_999).expansion).toBeLessThan(0.01);
  });

  it('increases monotonically while inhaling and decreases while exhaling', () => {
    let previous = -1;
    for (let t = 0; t <= 3_000; t += 50) {
      const value = sampleCycle(phases, t).expansion;
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }

    previous = 2;
    for (let t = 3_000; t < 10_000; t += 50) {
      const value = sampleCycle(phases, t).expansion;
      expect(value).toBeLessThanOrEqual(previous);
      previous = value;
    }
  });

  it('treats negative time as the start of the cycle', () => {
    expect(sampleCycle(phases, -500).phase.id).toBe('inhale');
    expect(sampleCycle(phases, -500).expansion).toBeCloseTo(0, 6);
  });
});

describe('inhaleProgress', () => {
  const phases = buildCycle(getLevel('relax'));

  it('spans 0..1 across both inhale phases and is 0 while exhaling', () => {
    expect(inhaleProgress(sampleCycle(phases, 0), phases)).toBeCloseTo(0, 6);
    expect(inhaleProgress(sampleCycle(phases, 1_500), phases)).toBeCloseTo(0.5, 6);
    expect(inhaleProgress(sampleCycle(phases, 2_999), phases)).toBeGreaterThan(0.99);
    expect(inhaleProgress(sampleCycle(phases, 6_000), phases)).toBe(0);
  });
});

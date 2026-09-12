import { describe, expect, it } from 'vitest';
import { buildCycle, getLevel, sampleCycle } from '../engine/pattern';
import {
  GUIDE_EMPTY_R,
  GUIDE_FIRST_R,
  GUIDE_FULL_R,
  ORB_MAX_R,
  ORB_MIN_R,
  orbRadius,
} from './geometry';

/**
 * Radii measured from the reference recording, normalised against its outer
 * ring: empty 56/148, first-inhale 114/148, full 148/148.
 */
const REFERENCE_EMPTY = 56 / 148;
const REFERENCE_FIRST = 114 / 148;

describe('orbRadius', () => {
  it('spans the orb range', () => {
    expect(orbRadius(0)).toBe(ORB_MIN_R);
    expect(orbRadius(1)).toBe(ORB_MAX_R);
    expect(orbRadius(0.5)).toBeCloseTo((ORB_MIN_R + ORB_MAX_R) / 2, 6);
  });
});

describe('guide rings', () => {
  const phases = buildCycle(getLevel('relax'));
  const [inhale, sharpInhale] = phases;

  it('are ordered and fit inside the viewBox', () => {
    expect(GUIDE_EMPTY_R).toBeLessThan(GUIDE_FIRST_R);
    expect(GUIDE_FIRST_R).toBeLessThan(GUIDE_FULL_R);
    expect(GUIDE_FULL_R).toBeLessThan(100);
  });

  it('match the proportions of the reference design', () => {
    expect(GUIDE_EMPTY_R / GUIDE_FULL_R).toBeCloseTo(REFERENCE_EMPTY, 1);
    expect(GUIDE_FIRST_R / GUIDE_FULL_R).toBeCloseTo(REFERENCE_FIRST, 1);
  });

  it('sit exactly where the orb rests at the end of each phase', () => {
    // End of the exhale: lungs empty.
    expect(orbRadius(0)).toBeCloseTo(GUIDE_EMPTY_R, 6);
    // End of the first inhale, where the sharp top-up takes over.
    expect(orbRadius(inhale?.to ?? -1)).toBeCloseTo(GUIDE_FIRST_R, 6);
    // Top of the sharp second inhale: lungs full.
    expect(orbRadius(sharpInhale?.to ?? -1)).toBeCloseTo(GUIDE_FULL_R, 6);
  });

  it('is reached by the orb as each phase boundary is crossed', () => {
    const cycle = 10_000;
    const atEndOf = (id: string): number => {
      let offset = 0;
      for (const phase of phases) {
        offset += phase.durationMs;
        if (phase.id === id) break;
      }
      return offset;
    };

    // Sample just before each boundary so the sample stays inside the phase.
    expect(orbRadius(sampleCycle(phases, atEndOf('inhale') - 1).expansion)).toBeCloseTo(
      GUIDE_FIRST_R,
      1,
    );
    expect(orbRadius(sampleCycle(phases, atEndOf('sharpInhale') - 1).expansion)).toBeCloseTo(
      GUIDE_FULL_R,
      1,
    );
    expect(orbRadius(sampleCycle(phases, cycle - 1).expansion)).toBeCloseTo(GUIDE_EMPTY_R, 1);
  });
});

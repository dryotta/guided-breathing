import { FIRST_INHALE_PEAK } from '../engine/pattern';

/**
 * Orb and guide-ring geometry, in SVG user units for a 200×200 viewBox.
 *
 * Three dotted guide rings are always on screen so the shape of the
 * physiological sigh is readable at a glance, and so it is obvious that the
 * inhale happens in two steps:
 *
 *   empty  – where the orb rests with empty lungs; reaching it ends the exhale
 *   first  – where the first inhale ends and the sharp top-up begins
 *   full   – full lungs, the top of the sharp second inhale
 *
 * The ring radii are derived from `orbRadius`, so the orb always lands exactly
 * on a ring at each landmark and the two can never drift apart.
 */
export const CENTER = 100;
export const ORB_MIN_R = 33;
export const ORB_MAX_R = 88;

/** Orb radius for a normalised lung expansion, 0..1. */
export function orbRadius(expansion: number): number {
  return ORB_MIN_R + (ORB_MAX_R - ORB_MIN_R) * expansion;
}

export const GUIDE_EMPTY_R = orbRadius(0);
export const GUIDE_FIRST_R = orbRadius(FIRST_INHALE_PEAK);
export const GUIDE_FULL_R = orbRadius(1);

/**
 * Dash pattern for the guide rings. The gap is sized so the outer ring carries
 * roughly 128 dots, matching the density of the reference design.
 */
const DOTS_ON_OUTER_RING = 128;
const DOT_LENGTH = 0.6;
const DOT_GAP = (2 * Math.PI * GUIDE_FULL_R) / DOTS_ON_OUTER_RING - DOT_LENGTH;
export const DOT_DASH = `${DOT_LENGTH} ${DOT_GAP.toFixed(2)}`;

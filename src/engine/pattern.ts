/**
 * Breathing pattern definitions for the physiological sigh.
 *
 * A cycle is always: a long nasal inhale, a short sharp top-up inhale, then a
 * slow mouth exhale. A level advertises a total inhale time and a total exhale
 * time; the inhale budget is split between the two inhale phases so that the
 * advertised numbers stay exact (inhale + exhale === cycle duration).
 */

export type LevelId = 'relax' | 'easy' | 'intermediate' | 'hard' | 'elite';

export interface Level {
  readonly id: LevelId;
  /** Total inhale time in milliseconds (both inhale phases combined). */
  readonly inhaleMs: number;
  /** Exhale time in milliseconds. */
  readonly exhaleMs: number;
}

export const LEVELS: readonly Level[] = [
  { id: 'relax', inhaleMs: 3_000, exhaleMs: 7_000 },
  { id: 'easy', inhaleMs: 5_000, exhaleMs: 10_000 },
  { id: 'intermediate', inhaleMs: 10_000, exhaleMs: 20_000 },
  { id: 'hard', inhaleMs: 20_000, exhaleMs: 40_000 },
  { id: 'elite', inhaleMs: 30_000, exhaleMs: 60_000 },
];

export const DEFAULT_LEVEL_ID: LevelId = 'relax';

export function getLevel(id: LevelId): Level {
  const level = LEVELS.find((candidate) => candidate.id === id);
  if (!level) throw new Error(`Unknown level: ${id}`);
  return level;
}

export type PhaseId = 'inhale' | 'sharpInhale' | 'exhale';

export interface Phase {
  readonly id: PhaseId;
  readonly durationMs: number;
  /** Normalised lung expansion at the start of the phase (0 = empty, 1 = full). */
  readonly from: number;
  /** Normalised lung expansion at the end of the phase. */
  readonly to: number;
  readonly ease: (t: number) => number;
}

const easeInOutSine = (t: number): number => 0.5 - Math.cos(Math.PI * t) / 2;
const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

/**
 * Expansion reached at the end of the first inhale, before the sharp top-up.
 * The first inhale covers most of the *time* but only part of the expansion,
 * which is what gives the second inhale its sharp, sudden character.
 */
export const FIRST_INHALE_PEAK = 0.63;

/**
 * The sharp second inhale takes a fraction of the inhale budget but stays short
 * in absolute terms, so it still feels like a quick top-up at the slow paces.
 */
const SHARP_INHALE_RATIO = 0.3;
const SHARP_INHALE_MIN_MS = 600;
const SHARP_INHALE_MAX_MS = 3_000;

export function sharpInhaleMs(inhaleMs: number): number {
  const ratioed = inhaleMs * SHARP_INHALE_RATIO;
  return Math.min(SHARP_INHALE_MAX_MS, Math.max(SHARP_INHALE_MIN_MS, ratioed));
}

export function buildCycle(level: Level): readonly Phase[] {
  const sharp = sharpInhaleMs(level.inhaleMs);
  const first = level.inhaleMs - sharp;
  return [
    { id: 'inhale', durationMs: first, from: 0, to: FIRST_INHALE_PEAK, ease: easeInOutSine },
    { id: 'sharpInhale', durationMs: sharp, from: FIRST_INHALE_PEAK, to: 1, ease: easeOutQuad },
    { id: 'exhale', durationMs: level.exhaleMs, from: 1, to: 0, ease: easeInOutSine },
  ];
}

export function cycleDurationMs(phases: readonly Phase[]): number {
  return phases.reduce((total, phase) => total + phase.durationMs, 0);
}

export interface CycleSample {
  readonly phase: Phase;
  readonly phaseIndex: number;
  /** Progress through the current phase, 0..1. */
  readonly phaseProgress: number;
  /** Progress through the whole cycle, 0..1. */
  readonly cycleProgress: number;
  /** Zero-based index of the cycle this sample falls in. */
  readonly cycleIndex: number;
  /** Eased lung expansion, 0..1. */
  readonly expansion: number;
}

/**
 * Sample the cycle at an absolute elapsed time. A pure function of `elapsedMs`,
 * which is what keeps the animation free of accumulated drift.
 */
export function sampleCycle(phases: readonly Phase[], elapsedMs: number): CycleSample {
  const total = cycleDurationMs(phases);
  const clamped = Math.max(0, elapsedMs);
  const cycleIndex = Math.floor(clamped / total);
  let offset = clamped - cycleIndex * total;

  for (let index = 0; index < phases.length; index += 1) {
    const phase = phases[index];
    if (!phase) break;
    const isLast = index === phases.length - 1;
    if (offset < phase.durationMs || isLast) {
      const phaseProgress = phase.durationMs > 0 ? Math.min(1, offset / phase.durationMs) : 1;
      const eased = phase.ease(phaseProgress);
      return {
        phase,
        phaseIndex: index,
        phaseProgress,
        cycleProgress: offset / total,
        cycleIndex,
        expansion: phase.from + (phase.to - phase.from) * eased,
      };
    }
    offset -= phase.durationMs;
  }

  throw new Error('Cycle must contain at least one phase');
}

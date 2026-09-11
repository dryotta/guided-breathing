import { describe, expect, it, vi } from 'vitest';
import { BreathingSession, type Scheduler, type SessionFrame } from './session';
import { buildCycle, getLevel } from './pattern';

/** A scheduler under test control: frames only advance when we say so. */
function manualScheduler(): Scheduler & { run: (now: number) => void; pending: () => boolean } {
  let queued: ((now: number) => void) | null = null;
  return {
    request: (callback) => {
      queued = callback;
      return 1;
    },
    cancel: () => {
      queued = null;
    },
    run: (now) => {
      const callback = queued;
      queued = null;
      callback?.(now);
    },
    pending: () => queued !== null,
  };
}

function harness(totalMs = 60_000) {
  let now = 0;
  const scheduler = manualScheduler();
  const frames: SessionFrame[] = [];
  const onComplete = vi.fn();

  const session = new BreathingSession({
    totalMs,
    phases: buildCycle(getLevel('relax')), // 2.1s / 0.9s / 7s
    onFrame: (frame) => frames.push(frame),
    onComplete,
    now: () => now,
    scheduler,
  });

  return {
    session,
    frames,
    onComplete,
    scheduler,
    set: (value: number) => {
      now = value;
    },
    advance: (ms: number) => {
      now += ms;
      scheduler.run(now);
    },
    last: (): SessionFrame => {
      const frame = frames.at(-1);
      if (!frame) throw new Error('no frames rendered');
      return frame;
    },
  };
}

describe('BreathingSession', () => {
  it('renders an initial frame at the start of the inhale', () => {
    const h = harness();
    h.session.start();

    expect(h.frames).toHaveLength(1);
    expect(h.last().sample.phase.id).toBe('inhale');
    expect(h.last().elapsedMs).toBe(0);
    expect(h.last().remainingMs).toBe(60_000);
  });

  it('walks through the full physiological-sigh cycle', () => {
    const h = harness();
    h.session.start();

    const phaseAt = (ms: number) => {
      h.set(ms);
      h.session.tick(ms);
      return h.last().sample.phase.id;
    };

    expect(phaseAt(1_000)).toBe('inhale');
    expect(phaseAt(2_500)).toBe('sharpInhale');
    expect(phaseAt(4_000)).toBe('exhale');
    expect(phaseAt(10_100)).toBe('inhale');
  });

  it('lands on the correct phase after a long background gap', () => {
    const h = harness(600_000);
    h.session.start();

    // Hidden for 3 min 1.5 s. 181.5s = 18 cycles (180s) + 1.5s => first inhale.
    h.advance(181_500);
    expect(h.last().sample.phase.id).toBe('inhale');
    expect(h.last().elapsedMs).toBe(181_500);
    expect(h.last().sample.cycleIndex).toBe(18);

    // A second gap landing mid-exhale.
    h.advance(5_000);
    expect(h.last().sample.phase.id).toBe('exhale');
    expect(h.last().elapsedMs).toBe(186_500);
  });

  it('stays visually continuous across a throttled gap', () => {
    const h = harness(600_000);
    h.session.start();

    h.advance(6_500); // mid-exhale
    const before = h.last().sample.expansion;

    // Exactly one whole cycle later the orb must be in the same place.
    h.advance(10_000);
    expect(h.last().sample.expansion).toBeCloseTo(before, 10);
  });

  it('completes when the session is jumped past its end while backgrounded', () => {
    const h = harness(60_000);
    h.session.start();

    h.advance(95_000);

    expect(h.onComplete).toHaveBeenCalledTimes(1);
    expect(h.onComplete).toHaveBeenCalledWith(6); // 60s / 10s cycle
    expect(h.last().isComplete).toBe(true);
    expect(h.last().remainingMs).toBe(0);
    expect(h.last().elapsedMs).toBe(60_000);
    expect(h.session.isFinished).toBe(true);
    expect(h.scheduler.pending()).toBe(false);
  });

  it('completes exactly once and stops rendering afterwards', () => {
    const h = harness(10_000);
    h.session.start();
    h.advance(10_000);

    const count = h.frames.length;
    h.session.tick(20_000);
    h.session.tick(30_000);

    expect(h.frames).toHaveLength(count);
    expect(h.onComplete).toHaveBeenCalledTimes(1);
  });

  it('freezes the clock while paused and resumes without losing time', () => {
    const h = harness(60_000);
    h.session.start();

    h.advance(4_000);
    h.session.pause();
    expect(h.session.isPaused).toBe(true);
    expect(h.last().isPaused).toBe(true);
    expect(h.scheduler.pending()).toBe(false);

    h.set(24_000);
    h.session.tick(24_000);
    expect(h.last().elapsedMs).toBe(4_000);

    h.session.resume();
    expect(h.session.isPaused).toBe(false);
    h.advance(1_000);
    expect(h.last().elapsedMs).toBe(5_000);
  });

  it('toggles pause state', () => {
    const h = harness();
    h.session.start();

    h.session.togglePause();
    expect(h.session.isPaused).toBe(true);
    h.session.togglePause();
    expect(h.session.isPaused).toBe(false);
  });

  it('stops scheduling and reports no longer paused once stopped', () => {
    const h = harness();
    h.session.start();
    h.session.stop();

    expect(h.session.isFinished).toBe(true);
    expect(h.session.isPaused).toBe(false);
    expect(h.scheduler.pending()).toBe(false);

    const count = h.frames.length;
    h.session.tick(5_000);
    expect(h.frames).toHaveLength(count);
  });

  it('keeps requesting frames while running', () => {
    const h = harness();
    h.session.start();
    expect(h.scheduler.pending()).toBe(true);

    h.advance(16);
    expect(h.scheduler.pending()).toBe(true);
    expect(h.frames.length).toBeGreaterThan(1);
  });
});

import { describe, expect, it } from 'vitest';
import { SessionClock } from './clock';

describe('SessionClock', () => {
  it('rejects a non-positive duration', () => {
    expect(() => new SessionClock(0)).toThrow();
    expect(() => new SessionClock(-1)).toThrow();
  });

  it('derives elapsed time from absolute timestamps, so it cannot drift', () => {
    const clock = new SessionClock(600_000);
    clock.start(1_000);

    // Thousands of irregular samples still agree exactly with wall-clock time.
    let now = 1_000;
    for (let i = 0; i < 5_000; i += 1) {
      now += 16.6667 + (i % 7);
      expect(clock.elapsedMs(now)).toBeCloseTo(now - 1_000, 9);
    }
  });

  it('reports the true elapsed time after a throttled background gap', () => {
    const clock = new SessionClock(600_000);
    clock.start(0);
    clock.elapsedMs(1_000);

    // Tab hidden for 4 minutes: no ticks at all, then one huge jump.
    expect(clock.elapsedMs(241_000)).toBe(241_000);
    expect(clock.remainingMs(241_000)).toBe(359_000);
  });

  it('excludes paused time', () => {
    const clock = new SessionClock(60_000);
    clock.start(0);
    clock.pause(5_000);

    expect(clock.elapsedMs(5_000)).toBe(5_000);
    expect(clock.elapsedMs(30_000)).toBe(5_000);
    expect(clock.isRunning).toBe(false);

    clock.resume(30_000);
    expect(clock.isRunning).toBe(true);
    expect(clock.elapsedMs(32_000)).toBe(7_000);
  });

  it('ignores redundant pause and resume calls', () => {
    const clock = new SessionClock(60_000);
    clock.start(0);
    clock.resume(1_000);
    expect(clock.elapsedMs(2_000)).toBe(2_000);

    clock.pause(2_000);
    clock.pause(9_000);
    expect(clock.elapsedMs(9_000)).toBe(2_000);
  });

  it('clamps elapsed time to the session length but still reports completion', () => {
    const clock = new SessionClock(10_000);
    clock.start(0);

    expect(clock.isComplete(9_999)).toBe(false);
    expect(clock.isComplete(10_000)).toBe(true);
    expect(clock.elapsedMs(999_999)).toBe(10_000);
    expect(clock.remainingMs(999_999)).toBe(0);
  });

  it('tolerates a timestamp that moves backwards', () => {
    const clock = new SessionClock(10_000);
    clock.start(5_000);
    expect(clock.elapsedMs(4_000)).toBe(0);
  });

  it('restarts cleanly', () => {
    const clock = new SessionClock(10_000);
    clock.start(0);
    clock.pause(4_000);
    clock.start(100_000);
    expect(clock.elapsedMs(101_000)).toBe(1_000);
  });
});

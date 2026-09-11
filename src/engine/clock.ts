/**
 * Drift-free session clock.
 *
 * Elapsed time is always derived from absolute timestamps rather than
 * accumulated per-frame deltas, so a stalled render loop (backgrounded tab,
 * throttled timers, a long GC pause) can never desynchronise the session.
 * When the page comes back, the very next sample reports the true elapsed time.
 */
export class SessionClock {
  readonly totalMs: number;

  /** Time banked from previous run segments. */
  #accumulatedMs = 0;
  /** Timestamp the current run segment started at, or null while paused. */
  #runningSince: number | null = null;

  constructor(totalMs: number) {
    if (!(totalMs > 0)) throw new Error('totalMs must be greater than 0');
    this.totalMs = totalMs;
  }

  get isRunning(): boolean {
    return this.#runningSince !== null;
  }

  start(now: number): void {
    this.#accumulatedMs = 0;
    this.#runningSince = now;
  }

  pause(now: number): void {
    if (this.#runningSince === null) return;
    this.#accumulatedMs += Math.max(0, now - this.#runningSince);
    this.#runningSince = null;
  }

  resume(now: number): void {
    if (this.#runningSince !== null) return;
    this.#runningSince = now;
  }

  /** Raw elapsed run time, unclamped. */
  rawElapsedMs(now: number): number {
    const live = this.#runningSince === null ? 0 : Math.max(0, now - this.#runningSince);
    return this.#accumulatedMs + live;
  }

  /** Elapsed run time clamped to the session length. */
  elapsedMs(now: number): number {
    return Math.min(this.totalMs, this.rawElapsedMs(now));
  }

  remainingMs(now: number): number {
    return Math.max(0, this.totalMs - this.rawElapsedMs(now));
  }

  isComplete(now: number): boolean {
    return this.rawElapsedMs(now) >= this.totalMs;
  }
}

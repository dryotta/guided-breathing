import { SessionClock } from './clock';
import { type CycleSample, type Phase, cycleDurationMs, sampleCycle } from './pattern';

export interface SessionFrame {
  readonly elapsedMs: number;
  readonly remainingMs: number;
  readonly sample: CycleSample;
  readonly isPaused: boolean;
  readonly isComplete: boolean;
}

export interface SessionOptions {
  readonly totalMs: number;
  readonly phases: readonly Phase[];
  readonly onFrame: (frame: SessionFrame) => void;
  readonly onComplete: (completedCycles: number) => void;
  /** Injectable for tests; defaults to `performance.now`. */
  readonly now?: () => number;
  /** Injectable for tests; defaults to `requestAnimationFrame`. */
  readonly scheduler?: Scheduler;
}

export interface Scheduler {
  request: (callback: (now: number) => void) => number;
  cancel: (handle: number) => void;
}

export const rafScheduler: Scheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/**
 * Owns the one and only render loop. Every visual and every countdown is
 * derived from `clock.elapsedMs()` inside `tick`, so there is no second source
 * of timing anywhere in the app.
 */
export class BreathingSession {
  readonly clock: SessionClock;

  readonly #phases: readonly Phase[];
  readonly #cycleMs: number;
  readonly #onFrame: (frame: SessionFrame) => void;
  readonly #onComplete: (completedCycles: number) => void;
  readonly #now: () => number;
  readonly #scheduler: Scheduler;

  #handle: number | null = null;
  #finished = false;

  constructor(options: SessionOptions) {
    this.clock = new SessionClock(options.totalMs);
    this.#phases = options.phases;
    this.#cycleMs = cycleDurationMs(options.phases);
    this.#onFrame = options.onFrame;
    this.#onComplete = options.onComplete;
    this.#now = options.now ?? (() => performance.now());
    this.#scheduler = options.scheduler ?? rafScheduler;
  }

  get isPaused(): boolean {
    return !this.clock.isRunning && !this.#finished;
  }

  get isFinished(): boolean {
    return this.#finished;
  }

  start(): void {
    this.clock.start(this.#now());
    this.tick(this.#now());
    this.#schedule();
  }

  pause(): void {
    if (this.#finished || !this.clock.isRunning) return;
    this.clock.pause(this.#now());
    this.#cancel();
    this.tick(this.#now());
  }

  resume(): void {
    if (this.#finished || this.clock.isRunning) return;
    this.clock.resume(this.#now());
    this.tick(this.#now());
    this.#schedule();
  }

  togglePause(): void {
    if (this.clock.isRunning) this.pause();
    else this.resume();
  }

  stop(): void {
    this.#finished = true;
    this.clock.pause(this.#now());
    this.#cancel();
  }

  /**
   * Render one frame for the given timestamp. Public so tests can drive the
   * session deterministically, including large jumps that emulate a tab being
   * backgrounded and throttled.
   */
  tick(now: number): void {
    if (this.#finished) return;

    const elapsedMs = this.clock.elapsedMs(now);
    const complete = this.clock.isComplete(now);
    const sample = sampleCycle(this.#phases, elapsedMs);

    this.#onFrame({
      elapsedMs,
      remainingMs: this.clock.remainingMs(now),
      sample,
      isPaused: !this.clock.isRunning,
      isComplete: complete,
    });

    if (complete) {
      this.#finished = true;
      this.#cancel();
      this.clock.pause(now);
      this.#onComplete(Math.floor(this.clock.totalMs / this.#cycleMs));
    }
  }

  #schedule(): void {
    this.#cancel();
    const step = (now: number): void => {
      this.#handle = null;
      if (this.#finished || !this.clock.isRunning) return;
      this.tick(now);
      if (!this.#finished) this.#schedule();
    };
    this.#handle = this.#scheduler.request(step);
  }

  #cancel(): void {
    if (this.#handle !== null) {
      this.#scheduler.cancel(this.#handle);
      this.#handle = null;
    }
  }
}

import { BreathingSession } from '../engine/session';
import { buildCycle, cycleDurationMs, getLevel } from '../engine/pattern';
import { ScreenWakeLock } from '../engine/wakeLock';
import { strings } from '../i18n/strings';
import { type Settings, loadSettings, saveSettings } from '../state/settings';
import { renderCompleteScreen } from './completeScreen';
import { SessionScreen } from './sessionScreen';
import { renderSettingsScreen } from './settingsScreen';

export class App {
  readonly #root: HTMLElement;
  readonly #wakeLock = new ScreenWakeLock();

  #settings: Settings;
  #session: BreathingSession | null = null;

  constructor(root: HTMLElement) {
    this.#root = root;
    this.#settings = loadSettings();
    document.addEventListener('visibilitychange', this.#handleVisibilityChange);
    this.#showSettings();
  }

  #handleVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') return;
    // The clock is timestamp-based, so coming back from a throttled background
    // tab only needs a repaint plus a fresh wake lock.
    void this.#wakeLock.refresh();
    this.#session?.tick(performance.now());
  };

  #mount(screen: HTMLElement): void {
    this.#root.replaceChildren(screen);
  }

  #applyLocale(): void {
    document.documentElement.lang = strings(this.#settings.locale).htmlLang;
  }

  #showSettings(focusKey?: string): void {
    this.#teardownSession();
    this.#applyLocale();
    const screen = renderSettingsScreen(this.#settings, {
      onChange: (patch, key) => {
        this.#settings = { ...this.#settings, ...patch };
        saveSettings(this.#settings);
        this.#showSettings(key);
      },
      onStart: () => this.#startSession(),
    });

    // Re-rendering after a settings tap is not a screen transition, so skip
    // the enter animation and put focus back where the user left it.
    if (focusKey) screen.classList.add('no-enter');

    this.#mount(screen);
    if (focusKey) {
      this.#root.querySelector<HTMLElement>(`[data-key="${focusKey}"]`)?.focus();
    }
  }

  #startSession(): void {
    this.#teardownSession();

    const t = strings(this.#settings.locale);
    const phases = buildCycle(getLevel(this.#settings.level));
    const totalMs = this.#settings.durationMinutes * 60_000;

    const screen = new SessionScreen(t, {
      onClose: () => this.#showSettings(),
      onTogglePause: () => {
        this.#session?.togglePause();
        if (this.#session?.isPaused) void this.#wakeLock.release();
        else void this.#wakeLock.acquire();
      },
    });

    const session = new BreathingSession({
      totalMs,
      phases,
      onFrame: (frame) => screen.render(frame),
      onComplete: () => this.#showComplete(),
    });

    this.#session = session;
    this.#mount(screen.element);
    session.start();
    void this.#wakeLock.acquire();
  }

  #showComplete(): void {
    const t = strings(this.#settings.locale);
    const phases = buildCycle(getLevel(this.#settings.level));
    const cycles = Math.floor((this.#settings.durationMinutes * 60_000) / cycleDurationMs(phases));

    this.#teardownSession();
    this.#mount(
      renderCompleteScreen(t, this.#settings.durationMinutes, cycles, {
        onAgain: () => this.#startSession(),
        onSettings: () => this.#showSettings(),
      }),
    );
  }

  #teardownSession(): void {
    this.#session?.stop();
    this.#session = null;
    void this.#wakeLock.release();
  }
}

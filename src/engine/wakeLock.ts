/**
 * Screen Wake Lock with a graceful no-op fallback.
 *
 * Supported on Chrome/Edge/Android Chrome and iOS Safari 16.4+. Everywhere else
 * (and whenever the request is rejected, e.g. low battery or a non-visible
 * page) the app simply carries on without it — no console noise.
 */
export class ScreenWakeLock {
  #sentinel: WakeLockSentinel | null = null;
  #wanted = false;

  static get isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }

  get isActive(): boolean {
    return this.#sentinel !== null;
  }

  async acquire(): Promise<void> {
    this.#wanted = true;
    if (!ScreenWakeLock.isSupported || this.#sentinel) return;
    if (document.visibilityState !== 'visible') return;

    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (!this.#wanted) {
        await sentinel.release().catch(() => undefined);
        return;
      }
      this.#sentinel = sentinel;
      sentinel.addEventListener('release', () => {
        if (this.#sentinel === sentinel) this.#sentinel = null;
      });
    } catch {
      // Unsupported, denied, or the document lost visibility mid-request.
      this.#sentinel = null;
    }
  }

  /** Re-acquire after the OS dropped the lock (tab hidden, screen off). */
  async refresh(): Promise<void> {
    if (this.#wanted && !this.#sentinel) await this.acquire();
  }

  async release(): Promise<void> {
    this.#wanted = false;
    const sentinel = this.#sentinel;
    this.#sentinel = null;
    if (sentinel) await sentinel.release().catch(() => undefined);
  }
}

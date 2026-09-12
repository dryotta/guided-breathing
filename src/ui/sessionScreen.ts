import type { SessionFrame } from '../engine/session';
import type { PhaseId } from '../engine/pattern';
import type { Strings } from '../i18n/strings';
import { el, formatClock, svg } from './dom';
import {
  CENTER,
  DOT_DASH,
  GUIDE_EMPTY_R,
  GUIDE_FIRST_R,
  GUIDE_FULL_R,
  ORB_MAX_R,
  ORB_MIN_R,
  orbRadius,
} from './geometry';

export interface SessionScreenHandlers {
  readonly onClose: () => void;
  readonly onTogglePause: () => void;
}

function icon(path: string): SVGSVGElement {
  return svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('path', {
      d: path,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  ]);
}

const CLOSE_PATH = 'M6 6 L18 18 M18 6 L6 18';
const PAUSE_PATH = 'M9 5 L9 19 M15 5 L15 19';
const PLAY_PATH = 'M8 5 L19 12 L8 19 Z';

function dottedGuide(radius: number, className: string): SVGCircleElement {
  return svg('circle', {
    class: className,
    cx: CENTER,
    cy: CENTER,
    r: radius,
    fill: 'none',
    'stroke-dasharray': DOT_DASH,
    'stroke-linecap': 'round',
  });
}

function gradient(id: string, from: string, to: string): SVGLinearGradientElement {
  return svg(
    'linearGradient',
    { id, x1: '0', y1: '0', x2: '0.35', y2: '1' },
    [
      svg('stop', { offset: '0', 'stop-color': from }),
      svg('stop', { offset: '1', 'stop-color': to }),
    ],
  );
}

export class SessionScreen {
  readonly element: HTMLElement;

  readonly #clockText: HTMLElement;
  readonly #cueText: HTMLElement;
  readonly #pauseButton: HTMLButtonElement;
  readonly #pauseIcon: SVGSVGElement;
  readonly #glow: HTMLElement;
  readonly #warmRing: SVGCircleElement;
  readonly #coolRing: SVGCircleElement;
  readonly #strings: Strings;

  #lastClock = '';
  #lastPhase: PhaseId | null = null;
  #lastPaused: boolean | null = null;

  constructor(t: Strings, handlers: SessionScreenHandlers) {
    this.#strings = t;

    const closeButton = el('button', { type: 'button', class: 'icon-button', 'aria-label': t.close }, [
      icon(CLOSE_PATH),
    ]);
    closeButton.addEventListener('click', handlers.onClose);

    this.#pauseIcon = icon(PAUSE_PATH);
    this.#pauseButton = el('button', { type: 'button', class: 'icon-button', 'aria-label': t.pause }, [
      this.#pauseIcon,
    ]);
    this.#pauseButton.addEventListener('click', handlers.onTogglePause);

    this.#clockText = el('p', { class: 'session-clock', role: 'timer', 'aria-live': 'off' }, ['00:00']);

    const orbAttrs = { cx: CENTER, cy: CENTER, r: ORB_MIN_R, fill: 'none', 'stroke-width': 1.6 };
    this.#warmRing = svg('circle', { ...orbAttrs, class: 'orb-ring orb-ring-warm', stroke: 'url(#warm)' });
    this.#coolRing = svg('circle', { ...orbAttrs, class: 'orb-ring orb-ring-cool', stroke: 'url(#cool)' });

    const rings = svg(
      'svg',
      { class: 'rings', viewBox: '0 0 200 200', 'aria-hidden': 'true', focusable: 'false' },
      [
        svg('defs', {}, [gradient('warm', '#ff6b5a', '#ffa24c'), gradient('cool', '#63d2ff', '#2f8fe0')]),
        dottedGuide(GUIDE_FULL_R, 'guide guide-full'),
        dottedGuide(GUIDE_FIRST_R, 'guide guide-first'),
        dottedGuide(GUIDE_EMPTY_R, 'guide guide-empty'),
        this.#warmRing,
        this.#coolRing,
      ],
    );

    this.#glow = el('div', { class: 'orb-glow', 'aria-hidden': 'true' });
    // Keep the glow's footprint locked to the SVG geometry.
    const glowSize = `${(ORB_MAX_R / CENTER) * 100}%`;
    this.#glow.style.width = glowSize;
    this.#glow.style.height = glowSize;

    this.#cueText = el('p', { class: 'cue-text', 'aria-live': 'polite' }, [t.cue.inhale]);

    this.element = el('main', { class: 'screen screen-session is-inhale' }, [
      el('header', { class: 'session-top' }, [
        closeButton,
        el('div', { class: 'session-heading' }, [
          el('h1', { class: 'session-title' }, [t.sessionTitle]),
          this.#clockText,
        ]),
        this.#pauseButton,
      ]),
      el('div', { class: 'stage' }, [this.#glow, rings]),
      el('footer', { class: 'cue' }, [
        el('span', { class: 'cue-dot', 'aria-hidden': 'true' }),
        this.#cueText,
      ]),
    ]);
  }

  render(frame: SessionFrame): void {
    const { sample } = frame;
    const radius = orbRadius(sample.expansion);
    const r = radius.toFixed(2);

    this.#warmRing.setAttribute('r', r);
    this.#coolRing.setAttribute('r', r);
    this.#glow.style.setProperty('--orb-scale', (radius / ORB_MAX_R).toFixed(4));

    const clock = formatClock(frame.remainingMs);
    if (clock !== this.#lastClock) {
      this.#lastClock = clock;
      this.#clockText.textContent = clock;
    }

    const phase = sample.phase.id;
    if (phase !== this.#lastPhase) {
      const warm = phase !== 'exhale';
      this.element.classList.toggle('is-inhale', warm);
      this.element.classList.toggle('is-exhale', !warm);
      this.#cueText.textContent = this.#strings.cue[phase];
      this.#lastPhase = phase;
    }

    if (frame.isPaused !== this.#lastPaused) {
      this.#lastPaused = frame.isPaused;
      this.element.classList.toggle('is-paused', frame.isPaused);
      const label = frame.isPaused ? this.#strings.resume : this.#strings.pause;
      this.#pauseButton.setAttribute('aria-label', label);
      const path = this.#pauseIcon.firstElementChild;
      path?.setAttribute('d', frame.isPaused ? PLAY_PATH : PAUSE_PATH);
    }
  }
}

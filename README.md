# Guided Breathing · 引导呼吸

A responsive guided-breathing web app built around the **physiological sigh**: a
long nasal inhale, a short sharp top-up inhale, then a slow mouth exhale.

No frameworks, no runtime dependencies — the production bundle is ~16 kB of
plain TypeScript and CSS.

## Features

- **Physiological sigh cycle** — inhale → sharp second inhale → slow exhale, on
  a loop for the whole session.
- **Three guide rings**, always on screen, marking the three landmarks of the
  breath so its shape is readable at a glance.
- **Session length** — 5, 10 (default) or 15 minutes.
- **Language** — 中文 (default) and English.
- **Pace** — Relax `3s/7s` (default), Easy `5s/10s`, Intermediate `10s/20s`,
  Hard `20s/40s`, Elite `30s/60s`.
- **Drift-free timing** that recovers correctly from backgrounding and throttling.
- **Screen Wake Lock** while a session runs, with a silent fallback when it is
  unavailable or refused.
- **Settings persisted** to `localStorage`, validated field-by-field on read.
- Pause/resume, keyboard-navigable settings, `prefers-reduced-motion` support,
  and safe-area insets for notched phones.

## How the timing works

All timing lives in `src/engine/` and there is exactly one render loop.

| File | Responsibility |
| --- | --- |
| `pattern.ts` | Level definitions, the expansion curve, and `sampleCycle(phases, elapsedMs)` — a **pure function** of elapsed time that returns the current phase and eased lung expansion. |
| `clock.ts` | `SessionClock` — elapsed time derived from absolute `performance.now()` timestamps, never from accumulated per-frame deltas. |
| `session.ts` | `BreathingSession` — the single `requestAnimationFrame` loop that samples the clock and emits one frame object. |

Because every visual and the countdown are derived from
`clock.elapsedMs(now)` on each tick:

- **No drift.** Errors cannot accumulate, since nothing is ever summed frame by
  frame. A 15-minute session is accurate to the resolution of `performance.now()`.
- **Throttling and backgrounding recover automatically.** When a tab is hidden,
  `requestAnimationFrame` stops. On return, the next tick reads the true elapsed
  time and renders the correct phase — mid-cycle, or completed if the session
  ended while hidden. A `visibilitychange` listener forces that tick immediately
  and re-acquires the wake lock.

The session keeps running in real time while hidden, which is the right
behaviour for a timed breathing practice. Use the pause button to stop the clock.

### Phase split

A level advertises a total inhale and exhale time. The inhale budget is split so
the advertised numbers stay exact (`inhale + exhale === cycle`), while the second
inhale stays genuinely short — 30% of the inhale, clamped to 0.6–3 s:

| Level | Inhale | Sharp inhale | Exhale | Cycle |
| --- | --- | --- | --- | --- |
| Relax | 2.1 s | 0.9 s | 7 s | 10 s |
| Easy | 3.5 s | 1.5 s | 10 s | 15 s |
| Intermediate | 7 s | 3 s | 20 s | 30 s |
| Hard | 17 s | 3 s | 40 s | 60 s |
| Elite | 27 s | 3 s | 60 s | 90 s |

## Rendering

Three dotted guide rings stay on screen for the whole session, one for each
landmark of the breath. They make it obvious that the inhale happens in two
steps, and exactly when the exhale is finished:

| Ring | Radius | Meaning |
| --- | --- | --- |
| Inner | `orbRadius(0)` | Lungs empty — the orb returns here when the exhale ends |
| Middle | `orbRadius(FIRST_INHALE_PEAK)` | The first inhale ends and the sharp top-up begins |
| Outer | `orbRadius(1)` | Lungs full — the top of the sharp second inhale |

The radii are derived from the same `orbRadius` function the animation uses
(`src/ui/geometry.ts`), so the orb always lands exactly on a ring at each
boundary and the two cannot drift apart. Their proportions — 0.375 and 0.769 of
the outer ring — are taken from the reference design.

The orb itself is split across two layers so it stays smooth on phones:

- The **soft glow** is an HTML element animated with a GPU-composited
  `transform: scale()`.
- The **crisp outline** and the dotted rings are SVG, so the stroke width never
  scales with the orb.

Per frame the app writes one CSS custom property and a handful of SVG
attributes; text nodes are only touched when they actually change.

## Browser support

Tested against Chromium; written to the baseline shared by iOS Safari 16.4+,
Android Chrome, and desktop Chrome/Safari/Edge. Notable choices:

- `100dvh` with a `100vh` fallback, plus `env(safe-area-inset-*)` padding.
- `touch-action: manipulation` to remove the tap delay and double-tap zoom.
- Wake Lock, `matchMedia`, and `localStorage` are all feature-detected or
  wrapped, so unsupported or blocked APIs degrade silently.

## Development

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm test           # unit tests (vitest)
npm run typecheck  # tsc --noEmit, strict mode
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
```

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main` and on pull
requests. It installs with `npm ci`, runs the tests, builds, and — for `main`
only — uploads `dist/` and deploys it to GitHub Pages.

One-time repository setup: **Settings → Pages → Build and deployment → Source →
GitHub Actions**.

The build uses a relative `base`, so it works from a project subpath
(`user.github.io/guided-breathing/`), a custom domain, or a plain static host
without reconfiguration.

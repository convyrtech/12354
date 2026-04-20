/**
 * Viewport-height cap used by scroll-driven homepage sections.
 *
 * Invariant (load-bearing — do NOT change one side without the other):
 *   EFFECTIVE_VIEWPORT_CAP_PX (this file)
 *     ≡ --viewport-cap   (src/app/globals.css :root)
 *     ≡ max-height on sticky pins (.hero-stage, .aquarium-to-table__pin)
 *
 * Why it exists: on tall viewports (e.g. 1920×1200 laptop) raw `100vh` / `innerHeight`
 * stretches the cinematic sections beyond what their layout/scoring math was tuned for.
 * The cap pins every scroll/proximity calculation to the same "logical" viewport so
 * the flip, cream-pause, and brand-story flow all behave like they do on 1080.
 *
 * Sticky-pin math worked example @ 1920×1200, aquarium section (280vh):
 *   rect.height ............. 3024  (CSS: min(280vh=3360, cap*2.8=3024) → cap wins)
 *   pin max-height .......... 1080
 *   scrollable distance ..... rect.height - 1080 = 1944  (real px, pin unsticks here)
 *   JS total denominator .... rect.height - getEffectiveViewportHeight() = 3024 - 1080 = 1944
 *   ⇒ progress reaches 1 exactly when sticky unsticks. Consistent.
 */
export const EFFECTIVE_VIEWPORT_CAP_PX = 1080;

export function getEffectiveViewportHeight(): number {
  if (typeof window === "undefined") return EFFECTIVE_VIEWPORT_CAP_PX;
  const h = window.innerHeight;
  if (!h) return EFFECTIVE_VIEWPORT_CAP_PX;
  return Math.min(h, EFFECTIVE_VIEWPORT_CAP_PX);
}

/**
 * Build a CSS string that reads the capped viewport height as a CSS value.
 *   vhCapped(50)  -> "min(50vh, calc(var(--viewport-cap) * 0.5))"
 *   vhCapped(200) -> "min(200vh, calc(var(--viewport-cap) * 2))"
 * Used where blocks/containers are positioned in vh units but must not drift
 * past the 1080 cap at render time.
 */
export function vhCapped(n: number): string {
  return `min(${n}vh, calc(var(--viewport-cap) * ${n / 100}))`;
}

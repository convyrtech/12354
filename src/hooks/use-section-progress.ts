"use client";

import { useEffect, type RefObject } from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

// rAF + getBoundingClientRect (not framer's useScroll) — useScroll desyncs
// against Lenis in Firefox, reporting progress = 1 prematurely. Reading
// layout per frame stays deterministic cross-browser.

export type SectionProgressMode = "through" | "enter";

export type UseSectionProgressOptions = {
  menuOpenGuard?: boolean;
  disabled?: boolean;
};

const MENU_SAFE_WINDOW_MS = 900;

export function useSectionProgress(
  ref: RefObject<HTMLElement | null>,
  mode: SectionProgressMode,
  options: UseSectionProgressOptions = {},
): MotionValue<number> {
  const progress = useMotionValue(0);
  const { menuOpenGuard = false, disabled = false } = options;

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;

    const homeMain = menuOpenGuard
      ? el.closest<HTMLElement>(".home-main")
      : null;

    let raf = 0;
    let menuTransformUntil = 0;

    const measure = () => {
      if (menuOpenGuard) {
        const now = performance.now();
        const menuOpen =
          typeof document !== "undefined" &&
          document.body.dataset.menuOpen === "true";
        const ancestorTransform = homeMain
          ? getComputedStyle(homeMain).transform
          : "none";
        const hasTransform = ancestorTransform && ancestorTransform !== "none";
        if (menuOpen || hasTransform) {
          menuTransformUntil = now + MENU_SAFE_WINDOW_MS;
        }
        if (now < menuTransformUntil) {
          progress.set(0);
          raf = window.requestAnimationFrame(measure);
          return;
        }
      }

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      let next: number;
      if (mode === "through") {
        const total = Math.max(1, rect.height - vh);
        next = Math.max(0, Math.min(1, -rect.top / total));
      } else {
        next = Math.max(0, Math.min(1, (vh - rect.top) / vh));
      }

      progress.set(next);
      raf = window.requestAnimationFrame(measure);
    };

    raf = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(raf);
  }, [ref, mode, menuOpenGuard, disabled, progress]);

  return progress;
}

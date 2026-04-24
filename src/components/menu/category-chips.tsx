"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MENU_NAV_OFFSET_PX,
  scrollToMenuAnchor,
} from "@/components/menu/shared/scroll-to-anchor";

export type CategoryChip = {
  id: string;
  label: string;
  anchor: string;
};

type Props = {
  chips: readonly CategoryChip[];
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function CategoryChips({ chips }: Props) {
  const prefersReduced = useReducedMotion();
  const [active, setActive] = useState<string | null>(chips[0]?.id ?? null);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const targets: HTMLElement[] = chips
      .map((chip) => document.getElementById(chip.anchor))
      .filter((el): el is HTMLElement => el != null);

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!visible[0]) return;
        const anchor = visible[0].target.id;
        const chip = chips.find((c) => c.anchor === anchor);
        if (!chip) return;
        setActive((prev) => (prev === chip.id ? prev : chip.id));
      },
      { rootMargin: `-${MENU_NAV_OFFSET_PX + 32}px 0px -55% 0px`, threshold: 0.01 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [chips]);

  useEffect(() => {
    if (!active) return;
    const chipEl = chipRefs.current.get(active);
    const trackEl = trackRef.current;
    if (chipEl && trackEl) {
      const left =
        chipEl.offsetLeft -
        trackEl.clientWidth / 2 +
        chipEl.clientWidth / 2;
      trackEl.scrollTo({
        left: Math.max(0, left),
        behavior: prefersReduced ? "auto" : "smooth",
      });
    }
  }, [active, prefersReduced]);

  const handleClick = useCallback(
    (chip: CategoryChip) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      scrollToMenuAnchor(chip.anchor);
      setActive(chip.id);
    },
    [],
  );

  return (
    <nav className="menu-sticky-nav" aria-label="Разделы меню">
      <div ref={trackRef} className="menu-sticky-nav__track">
        {chips.map((chip) => {
          const isActive = chip.id === active;
          return (
            <button
              key={chip.id}
              ref={(node) => {
                if (node) {
                  chipRefs.current.set(chip.id, node);
                } else {
                  chipRefs.current.delete(chip.id);
                }
              }}
              type="button"
              className="menu-sticky-nav__chip"
              data-active={isActive || undefined}
              onClick={handleClick(chip)}
            >
              {chip.label}
              {isActive ? (
                <motion.span
                  layoutId="menu-sticky-nav-underline"
                  className="menu-sticky-nav__chip-underline"
                  transition={{ duration: prefersReduced ? 0 : 0.3, ease: EASE }}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

export type CategoryChip = {
  id: string;
  label: string;
  anchor: string;
};

type Props = {
  chips: readonly CategoryChip[];
};

const NAV_OFFSET_PX = 96;
const EASE = [0.22, 1, 0.36, 1] as const;

export function CategoryChips({ chips }: Props) {
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
      { rootMargin: `-${NAV_OFFSET_PX + 32}px 0px -55% 0px`, threshold: 0.01 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [chips]);

  useEffect(() => {
    if (!active) return;
    const chipEl = chipRefs.current.get(active);
    if (chipEl && trackRef.current) {
      chipEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [active]);

  const handleClick = useCallback(
    (chip: CategoryChip) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const target = document.getElementById(chip.anchor);
      if (!target) return;
      const y = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET_PX - 16;
      window.scrollTo({ top: y, behavior: "smooth" });
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
                  transition={{ duration: 0.3, ease: EASE }}
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

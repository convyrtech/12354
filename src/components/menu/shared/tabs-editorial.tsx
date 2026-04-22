"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

export type TabOption<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  options: readonly TabOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
};

const SPRING = { type: "spring" as const, stiffness: 260, damping: 24, mass: 0.6 };

export function TabsEditorial<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: Props<T>) {
  const instanceId = useId();
  const prefersReduced = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="menu-tabs-editorial"
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-selected={selected || undefined}
            onClick={() => onChange(option.id)}
            className="menu-tabs-editorial__button"
          >
            <span>{option.label}</span>
            {selected ? (
              <motion.span
                layoutId={`menu-tab-underline-${instanceId}`}
                className="menu-tabs-editorial__underline"
                transition={prefersReduced ? { duration: 0 } : SPRING}
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

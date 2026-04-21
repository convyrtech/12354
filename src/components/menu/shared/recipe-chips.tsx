"use client";

import type { ModifierOption } from "@/lib/fixtures";
import { formatMoney } from "@/lib/fixtures";

type Props = {
  options: readonly ModifierOption[];
  value: string;
  onChange: (optionId: string) => void;
  ariaLabel?: string;
};

export function RecipeChips({ options, value, onChange, ariaLabel }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="menu-recipe-chips"
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            data-active={active || undefined}
            onClick={() => onChange(option.id)}
            className="menu-recipe-chip"
          >
            <span className="menu-recipe-chip__label">{option.label}</span>
            <span
              className="menu-recipe-chip__delta"
              data-included={option.priceDelta === 0 ? true : undefined}
            >
              {option.priceDelta > 0 ? `+${formatMoney(option.priceDelta)}` : "в цене"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

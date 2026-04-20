"use client";

import { formatMoney } from "@/lib/fixtures";
import { AddToCartLink } from "@/components/menu/shared/add-to-cart-link";
import { StopListNote } from "@/components/menu/shared/stop-list-note";

export type MenuTier = "S" | "M" | "L" | "XL" | "XXL";

const TIER_PIECES: Record<MenuTier, string> = {
  S: "20–25 шт/кг",
  M: "14–17 шт/кг",
  L: "11–13 шт/кг",
  XL: "8–10 шт/кг",
  XXL: "5–7 шт/кг",
};

export type SizeRowData = {
  tier: MenuTier;
  pricePerKg: number;
  state?: "available" | "sold_out";
  badgeLabel?: string;
};

type Props = {
  row: SizeRowData;
  onAdd?: (tier: MenuTier) => void;
};

export function SizeRow({ row, onAdd }: Props) {
  const isStopList = row.state === "sold_out";

  return (
    <tr
      className="menu-size-row"
      data-tier={row.tier}
      data-stop-list={isStopList || undefined}
    >
      <td className="menu-size-row__cell">
        <span className="menu-size-row__tier">{row.tier}</span>
        {row.badgeLabel ? (
          <em className="menu-card-compact__meta"> · {row.badgeLabel}</em>
        ) : null}
      </td>
      <td className="menu-size-row__cell menu-size-row__pieces">
        {TIER_PIECES[row.tier]}
      </td>
      <td className="menu-size-row__cell menu-size-row__price">
        {formatMoney(row.pricePerKg)}{" "}
        <span className="menu-size-row__unit">/ кг</span>
      </td>
      <td className="menu-size-row__cell" style={{ textAlign: "right" }}>
        {isStopList ? (
          <StopListNote />
        ) : (
          <AddToCartLink onClick={() => onAdd?.(row.tier)} disabled={!onAdd}>
            в корзину
          </AddToCartLink>
        )}
      </td>
    </tr>
  );
}

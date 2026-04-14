"use client";

import type { DraftLineItem } from "@/lib/line-item";
import { formatMoney } from "@/lib/fixtures";

type BasketLineItemsProps = {
  items: DraftLineItem[];
};

export function BasketLineItems({ items }: BasketLineItemsProps) {
  if (items.length === 0) {
    return <p className="basket-empty">Корзина пуста</p>;
  }

  return (
    <ul className="basket-line-items">
      {items.map((item, index) => (
        <li key={`${item.itemId}-${index}`} className="basket-line-item">
          <span className="basket-line-item__name">{item.itemName}</span>
          <span className="basket-line-item__qty">×{item.quantity}</span>
          <span className="basket-line-item__price">{formatMoney(item.totalPrice)}</span>
        </li>
      ))}
    </ul>
  );
}

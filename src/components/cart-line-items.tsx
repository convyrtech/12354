"use client";

import type { DraftLineItem } from "@/lib/line-item";
import { formatMoney } from "@/lib/fixtures";

type CartLineItemsProps = {
  items: DraftLineItem[];
  onRemove?: (index: number) => void;
  onIncrement?: (index: number) => void;
  onDecrement?: (index: number) => void;
};

export function CartLineItems({
  items,
  onRemove,
  onIncrement,
  onDecrement,
}: CartLineItemsProps) {
  if (items.length === 0) {
    return <p className="cart-empty">Корзина пуста</p>;
  }

  return (
    <ul className="cart-line-items">
      {items.map((item, index) => (
        <li key={`${item.itemId}-${index}`} className="cart-line-item">
          <div className="cart-line-item__info">
            <span className="cart-line-item__name">{item.itemName}</span>
            {item.summaryLines.map((line, i) => (
              <span key={i} className="cart-line-item__detail">{line}</span>
            ))}
          </div>
          <div className="cart-line-item__controls">
            {onDecrement && (
              <button type="button" onClick={() => onDecrement(index)}>−</button>
            )}
            <span className="cart-line-item__qty">{item.quantity}</span>
            {onIncrement && (
              <button type="button" onClick={() => onIncrement(index)}>+</button>
            )}
            {onRemove && (
              <button type="button" onClick={() => onRemove(index)}>✕</button>
            )}
          </div>
          <span className="cart-line-item__price">{formatMoney(item.totalPrice)}</span>
        </li>
      ))}
    </ul>
  );
}

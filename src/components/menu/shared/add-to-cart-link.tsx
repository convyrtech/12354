"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
  disabled?: boolean;
};

export const AddToCartLink = forwardRef<HTMLButtonElement, Props>(
  function AddToCartLink(
    { children = "в корзину", disabled, className, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={["menu-add-to-cart", className].filter(Boolean).join(" ")}
        disabled={disabled}
        {...rest}
      >
        <span>{children}</span>
        <span className="menu-add-to-cart__arrow" aria-hidden>
          →
        </span>
      </button>
    );
  },
);

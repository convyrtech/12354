export const CART_OPEN_EVENT = "raki:cart-open";

export function dispatchCartOpen() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_OPEN_EVENT));
}

export const MENU_NAV_OFFSET_PX = 96;

const SCROLL_GAP_PX = 16;

export function scrollToMenuAnchor(anchor: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(anchor);
  if (!el) return;
  const y =
    el.getBoundingClientRect().top +
    window.scrollY -
    MENU_NAV_OFFSET_PX -
    SCROLL_GAP_PX;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: y, behavior: reduced ? "instant" : "smooth" });
}

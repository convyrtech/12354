import Link from "next/link";
import { MENU_ENTRY } from "@/lib/homepage-data";

export function MenuEntry() {
  return (
    <section
      id="menu-entry"
      className="home-section menu-cta-section"
      style={{ paddingBottom: "clamp(108px, 12vw, 168px)", scrollMarginTop: 120 }}
    >
      <div className="home-shell">
        <div className="menu-cta-block">
          <div className="menu-cta-block__backdrop" aria-hidden />

          <span className="text-eyebrow menu-cta-block__eyebrow">{MENU_ENTRY.eyebrow}</span>

          <h2 className="menu-cta-block__headline">
            {MENU_ENTRY.lead}{" "}
            <em className="menu-cta-block__italic">{MENU_ENTRY.italic}</em>
          </h2>

          <p className="menu-cta-block__summary">{MENU_ENTRY.summary}</p>

          <Link href={MENU_ENTRY.cta.href} className="cta cta--primary menu-cta-block__cta">
            {MENU_ENTRY.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

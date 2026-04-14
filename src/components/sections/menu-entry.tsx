"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MENU_ENTRY } from "@/lib/homepage-data";

const EASE = [0.22, 1, 0.36, 1] as const;

export function MenuEntry() {
  return (
    <section
      id="menu-entry"
      className="home-section menu-cta-section"
      style={{ paddingBottom: "clamp(108px, 12vw, 168px)", scrollMarginTop: 120 }}
    >
      <div className="home-shell">
        <motion.div
          className="menu-cta-block"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.86, ease: EASE }}
        >
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
        </motion.div>
      </div>
    </section>
  );
}

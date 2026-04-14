"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MENU_ENTRY } from "@/lib/homepage-data";

const EASE = [0.22, 1, 0.36, 1] as const;

export function MenuEntry() {
  return (
    <section
      id="menu-entry"
      className="home-section"
      style={{ paddingBottom: "clamp(72px, 8vw, 112px)", scrollMarginTop: 120 }}
    >
      <div className="home-shell">
        <motion.div
          className="menu-entry"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.28 }}
          transition={{ duration: 0.76, ease: EASE }}
        >
          <div>
            <span className="text-eyebrow">{MENU_ENTRY.eyebrow}</span>
            <h2 className="text-h1" style={{ marginTop: 18 }}>
              {MENU_ENTRY.title}
            </h2>
          </div>

          <div className="menu-entry__body">
            <div className="menu-entry__intro">
              <p className="section-summary" style={{ maxWidth: 420 }}>
                {MENU_ENTRY.summary}
              </p>

              <div className="menu-entry__actions">
                <Link href="/menu?fulfillment=delivery" className="cta cta--primary">
                  Открыть меню
                </Link>
              </div>
            </div>

            <div className="menu-entry__links">
              {MENU_ENTRY.links.map((link) => (
                <Link key={link.label} href={link.href} className="menu-entry__link">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

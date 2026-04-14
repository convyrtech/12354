"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { QUALITY_PROOF } from "@/lib/homepage-data";

const EASE = [0.22, 1, 0.36, 1] as const;

export function BrandProof() {
  return (
    <section
      id="quality"
      className="home-section manifesto-section"
      style={{ paddingBottom: "clamp(108px, 12vw, 176px)", scrollMarginTop: 120 }}
    >
      <div className="home-shell">
        <div className="manifesto-block">
          <motion.span
            className="text-eyebrow"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.54, ease: EASE }}
          >
            {QUALITY_PROOF.eyebrow}
          </motion.span>

          <motion.p
            className="manifesto-text"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.92, ease: EASE }}
          >
            {QUALITY_PROOF.lead}{" "}
            <em className="manifesto-italic">{QUALITY_PROOF.italic}</em>{" "}
            {QUALITY_PROOF.tail}
          </motion.p>

          <motion.div
            className="manifesto-aside"
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.18, duration: 1, ease: EASE }}
          >
            <Image
              src={QUALITY_PROOF.image}
              alt="The Raki — философия"
              fill
              sizes="(max-width: 1279px) 100vw, 40vw"
              style={{ objectFit: "cover", objectPosition: "50% 50%" }}
            />
            <div className="manifesto-aside__veil" aria-hidden />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

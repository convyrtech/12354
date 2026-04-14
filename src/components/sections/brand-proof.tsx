"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { QUALITY_PROOF } from "@/lib/homepage-data";

const EASE = [0.22, 1, 0.36, 1] as const;

export function BrandProof() {
  return (
    <section
      id="quality"
      className="home-section"
      style={{ paddingBottom: "clamp(84px, 10vw, 144px)", scrollMarginTop: 120 }}
    >
      <div className="home-shell">
        <div className="quality-proof">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <span className="text-eyebrow">{QUALITY_PROOF.eyebrow}</span>
            <h2 className="text-h1" style={{ marginTop: 18, maxWidth: "11.5ch" }}>
              {QUALITY_PROOF.title}
            </h2>
            <p className="section-summary" style={{ marginTop: 18, maxWidth: 390 }}>
              {QUALITY_PROOF.summary}
            </p>
          </motion.div>

          <div className="quality-proof__grid">
            <div className="quality-proof__items">
              {QUALITY_PROOF.items.map((item, index) => (
                <motion.article
                  key={item.value}
                  className="quality-proof__item"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: index * 0.06, duration: 0.62, ease: EASE }}
                >
                  <span className="quality-proof__value">{item.value}</span>
                  <p>{item.label}</p>
                </motion.article>
              ))}
            </div>

            <motion.div
              className="quality-proof__media"
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: 0.12, duration: 0.82, ease: EASE }}
            >
              <Image
                src={QUALITY_PROOF.image}
                alt={QUALITY_PROOF.title}
                fill
                sizes="(max-width: 1279px) 100vw, 30vw"
                style={{ objectFit: "cover", objectPosition: "50% 50%" }}
              />
              <div className="quality-proof__veil" aria-hidden />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

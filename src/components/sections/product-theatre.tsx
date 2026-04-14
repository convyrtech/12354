"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { PRODUCT_THEATRE } from "@/lib/homepage-data";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ProductTheatre() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [42, -52]);

  return (
    <section
      ref={sectionRef}
      id="product"
      className="home-section experience-section"
      style={{ paddingBottom: "clamp(108px, 12vw, 176px)" }}
    >
      <div className="home-shell">
        <div className="home-divider" style={{ marginBottom: "clamp(48px, 6vw, 84px)" }} />

        <div className="experience-block">
          <motion.div
            className="experience-block__media"
            style={{ y: imageY }}
            initial={{ opacity: 0, clipPath: "inset(12% 0% 0% 0% round 12px)" }}
            whileInView={{ opacity: 1, clipPath: "inset(0% 0% 0% 0% round 12px)" }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1.04, ease: EASE }}
          >
            <Image
              src={PRODUCT_THEATRE.image}
              alt="The Raki — опыт и доверие"
              fill
              sizes="(max-width: 1279px) 100vw, 58vw"
              style={{
                objectFit: "cover",
                objectPosition: "50% 52%",
              }}
            />
            <div className="experience-block__veil" aria-hidden />
          </motion.div>

          <motion.div
            className="experience-block__copy"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: 0.12, duration: 0.86, ease: EASE }}
          >
            <span className="text-eyebrow">{PRODUCT_THEATRE.eyebrow}</span>
            <p className="experience-text">
              {PRODUCT_THEATRE.lead}{" "}
              <em className="experience-italic">{PRODUCT_THEATRE.italic}</em>{" "}
              {PRODUCT_THEATRE.tail}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

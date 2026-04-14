"use client";

import Image from "next/image";
import Link from "next/link";
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

  const imageY = useTransform(scrollYProgress, [0, 1], [30, -42]);

  return (
    <section
      ref={sectionRef}
      id="product"
      className="home-section"
      style={{ paddingBottom: "clamp(84px, 10vw, 152px)" }}
    >
      <div className="home-shell">
        <div className="home-divider" style={{ marginBottom: "clamp(28px, 4vw, 44px)" }} />

        <div className="product-theatre">
          <motion.div
            className="product-theatre__media"
            style={{ y: imageY }}
            initial={{ opacity: 0, clipPath: "inset(8% 0% 0% 0% round 40px)" }}
            whileInView={{ opacity: 1, clipPath: "inset(0% 0% 0% 0% round 40px)" }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.96, ease: EASE }}
          >
            <Image
              src={PRODUCT_THEATRE.image}
              alt={PRODUCT_THEATRE.title}
              fill
              sizes="(max-width: 1279px) 100vw, 66vw"
              style={{
                objectFit: "cover",
                objectPosition: "50% 52%",
              }}
            />
            <div className="product-theatre__veil" aria-hidden />
          </motion.div>

          <motion.div
            className="product-theatre__copy"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: 0.08, duration: 0.74, ease: EASE }}
          >
            <span className="text-eyebrow">{PRODUCT_THEATRE.eyebrow}</span>
            <h2 className="text-h1" style={{ marginTop: 18 }}>
              {PRODUCT_THEATRE.title}
            </h2>
            <p className="section-summary" style={{ marginTop: 18 }}>
              {PRODUCT_THEATRE.summary}
            </p>

            <div className="product-theatre__points">
              {PRODUCT_THEATRE.points.map((point) => (
                <span key={point}>{point}</span>
              ))}
            </div>

            <Link href="/menu?fulfillment=delivery" className="editorial-link">
              Смотреть меню
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

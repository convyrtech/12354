"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { HERO_SCENE } from "@/lib/homepage-data";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const mediaY = useTransform(scrollYProgress, [0, 1], [0, 64]);

  return (
    <section
      id="top"
      ref={sectionRef}
      className="hero-stage"
      style={{
        position: "relative",
        overflow: "clip",
        padding: "clamp(132px, 14vw, 168px) 0 clamp(84px, 10vw, 132px)",
      }}
    >
      <div className="home-shell">
        <div className="hero-layout">
          <div className="hero-copy">
            <motion.span
              className="text-eyebrow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: EASE }}
            >
              {HERO_SCENE.eyebrow}
            </motion.span>

            <h1 className="text-mega" style={{ marginTop: 28 }}>
              <span className="hero-line">
                <motion.span
                  initial={{ y: "102%", opacity: 0.2 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{ delay: 0.08, duration: 0.82, ease: EASE }}
                  style={{ display: "block" }}
                >
                  {HERO_SCENE.titleLead}
                </motion.span>
              </span>
              <span className="hero-line">
                <motion.em
                  initial={{ y: "102%", opacity: 0.2 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{ delay: 0.16, duration: 0.82, ease: EASE }}
                  style={{ display: "block", fontStyle: "italic", color: "var(--accent)" }}
                >
                  {HERO_SCENE.titleItalic}
                </motion.em>
              </span>
              <span className="hero-line">
                <motion.span
                  initial={{ y: "102%", opacity: 0.2 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{ delay: 0.24, duration: 0.82, ease: EASE }}
                  style={{ display: "block" }}
                >
                  {HERO_SCENE.titleTail}
                </motion.span>
              </span>
            </h1>

            <motion.p
              className="hero-summary"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, duration: 0.62, ease: EASE }}
            >
              {HERO_SCENE.summary}
            </motion.p>

            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.46, duration: 0.62, ease: EASE }}
            >
              <Link href="/menu?fulfillment=delivery" className="cta cta--primary">
                Открыть меню
              </Link>
            </motion.div>
          </div>

          <motion.div
            className="hero-visual"
            style={{ y: mediaY }}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.18, duration: 1.04, ease: EASE }}
          >
            <div className="hero-image-wrap">
              <Image
                src={HERO_SCENE.image}
                alt="Свежие раки и крабы на столе — The Raki private service"
                fill
                priority
                sizes="(max-width: 1279px) 100vw, 56vw"
                style={{
                  objectFit: "cover",
                  objectPosition: "56% 54%",
                }}
              />
              <div className="hero-image-tint" aria-hidden />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

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

  const mediaY = useTransform(scrollYProgress, [0, 1], [0, 42]);

  return (
    <section
      id="top"
      ref={sectionRef}
      className="hero-stage"
      style={{
        position: "relative",
        overflow: "clip",
        padding: "clamp(118px, 13vw, 148px) 0 clamp(72px, 9vw, 118px)",
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

            <h1 className="text-hero" style={{ marginTop: 18 }}>
              {HERO_SCENE.title.map((line, index) => (
                <span key={line} className="hero-line">
                  <motion.span
                    initial={{ y: "102%", opacity: 0.2 }}
                    animate={{ y: "0%", opacity: 1 }}
                    transition={{ delay: 0.08 + index * 0.07, duration: 0.78, ease: EASE }}
                    style={{ display: "block" }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              className="hero-summary"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, duration: 0.62, ease: EASE }}
            >
              {HERO_SCENE.summary}
            </motion.p>

            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34, duration: 0.62, ease: EASE }}
            >
              <Link href="/menu?fulfillment=delivery" className="cta cta--primary">
                Открыть меню
              </Link>
              <Link href="/#quality" className="editorial-link">
                О бренде
              </Link>
            </motion.div>

            <motion.div
              className="hero-facts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44, duration: 0.58, ease: EASE }}
            >
              {HERO_SCENE.facts.map((fact) => (
                <span key={fact}>{fact}</span>
              ))}
            </motion.div>
          </div>

          <motion.div
            className="hero-visual"
            style={{ y: mediaY }}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.14, duration: 0.92, ease: EASE }}
          >
            <div className="hero-image-wrap">
              <Image
                src={HERO_SCENE.image}
                alt="The Raki hero"
                fill
                priority
                sizes="(max-width: 1279px) 50vw, 48vw"
                style={{
                  objectFit: "cover",
                  objectPosition: "58% 56%",
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

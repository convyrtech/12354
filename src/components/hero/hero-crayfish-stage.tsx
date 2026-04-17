"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

// Viscous-out — no springy front-load, steady deceleration through the whole
// duration so the crayfish slows down as if settling into a fluid medium.
const VISCOUS_OUT = [0.22, 0.61, 0.36, 1] as const;

type HeroCrayfishStageProps = {
  entranceDelay?: number;
  entranceDuration?: number;
  idleDelay?: number;
  /** Rendered inside the entrance transform, before the crayfish image — sits behind the body. */
  children?: ReactNode;
  /** Rendered inside the entrance transform, after the crayfish image — sits in front of the body. */
  frontOverlay?: ReactNode;
};

export function HeroCrayfishStage({
  entranceDelay = 0.6,
  entranceDuration = 1.4,
  idleDelay = 5.06,
  children,
  frontOverlay,
}: HeroCrayfishStageProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div className="hero-crayfish-scene" aria-hidden>
      <div className="hero-crayfish-light" />
      <div className="hero-crayfish-depth" />

      <motion.div
        className="hero-crayfish-entrance"
        initial={
          prefersReduced
            ? { y: 0, rotate: 0, scale: 1 }
            : { y: "-180vh", rotate: -8, scale: 0.88 }
        }
        animate={{ y: 0, rotate: 0, scale: 1 }}
        transition={{
          duration: prefersReduced ? 0.2 : entranceDuration,
          delay: prefersReduced ? 0 : entranceDelay,
          ease: VISCOUS_OUT,
        }}
      >
        {children}

        <motion.div
          className="hero-crayfish-idle"
          animate={
            prefersReduced
              ? undefined
              : {
                  y: [0, -12, 0],
                  rotate: [0, 0.5, -0.3, 0],
                }
          }
          transition={
            prefersReduced
              ? undefined
              : {
                  duration: 8.5,
                  delay: idleDelay,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }
          }
        >
          <div className="hero-crayfish-asset">
            <Image
              src="/editorial/hero-crayfish-fall.png"
              alt=""
              fill
              priority
              sizes="(max-width: 767px) 88vw, (max-width: 1279px) 58vw, (max-width: 1599px) 54vw, 1360px"
              className="hero-crayfish-image"
            />
          </div>

          <motion.span
            className="hero-claw-wash"
            initial={prefersReduced ? { opacity: 0.2 } : { opacity: 0, scale: 0.62 }}
            animate={
              prefersReduced
                ? { opacity: 0.2 }
                : { opacity: [0, 0.32, 0.08], scale: [0.62, 1.04, 1.16] }
            }
            transition={{
              duration: 1.88,
              delay: prefersReduced ? 0 : entranceDelay + 0.5,
              ease: [0.2, 0.75, 0.25, 1],
              times: [0, 0.44, 1],
            }}
          />
        </motion.div>

        {frontOverlay}
      </motion.div>

      <div className="hero-crayfish-veil" />
    </div>
  );
}

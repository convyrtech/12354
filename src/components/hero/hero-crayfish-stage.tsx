"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

// Critically-damped entrance: viscous dive past equilibrium, then monotonic
// rise back to rest. No second overshoot — one bob feels physical without the
// "wiggle" of a free underdamped oscillator.
const DIVE_EASE = [0.22, 0.61, 0.36, 1] as const;   // high-velocity descent, viscous slowdown
const SETTLE_EASE = [0.35, 0, 0.45, 1] as const;    // 0 → fast → 0, no crossing

const ENTRANCE_TIMES = [0, 0.7, 1] as const;
const ENTRANCE_Y = ["-180vh", "2.4vh", "0vh"] as const;
const ENTRANCE_ROTATE = [-8, 2, 0] as const;
const ENTRANCE_SCALE = [0.88, 1, 1] as const;

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
            : { y: ENTRANCE_Y[0], rotate: ENTRANCE_ROTATE[0], scale: ENTRANCE_SCALE[0] }
        }
        animate={
          prefersReduced
            ? { y: 0, rotate: 0, scale: 1 }
            : {
                y: [...ENTRANCE_Y],
                rotate: [...ENTRANCE_ROTATE],
                scale: [...ENTRANCE_SCALE],
              }
        }
        transition={{
          duration: prefersReduced ? 0.2 : entranceDuration,
          delay: prefersReduced ? 0 : entranceDelay,
          times: prefersReduced ? undefined : [...ENTRANCE_TIMES],
          ease: prefersReduced
            ? undefined
            : [[...DIVE_EASE], [...SETTLE_EASE]],
        }}
      >
        {children}

        <motion.div
          className="hero-crayfish-idle"
          animate={
            prefersReduced
              ? undefined
              : {
                  y: [0, -14, 0],
                  x: [0, 4, -3, 0],
                  rotate: [0, 0.9, -0.5, 0.2, 0],
                }
          }
          transition={
            prefersReduced
              ? undefined
              : {
                  // Three non-commensurate periods → drift never re-syncs,
                  // gives the crayfish a living "biorhythm" instead of a
                  // mechanical sinusoid.
                  y: {
                    duration: 6.2,
                    delay: idleDelay,
                    ease: "easeInOut",
                    repeat: Number.POSITIVE_INFINITY,
                  },
                  x: {
                    duration: 9.4,
                    delay: idleDelay,
                    ease: "easeInOut",
                    repeat: Number.POSITIVE_INFINITY,
                  },
                  rotate: {
                    duration: 7.8,
                    delay: idleDelay,
                    ease: "easeInOut",
                    repeat: Number.POSITIVE_INFINITY,
                  },
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

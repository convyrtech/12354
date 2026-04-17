"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

// Viscous-out — no springy front-load, steady deceleration through the whole
// duration so the crayfish slows down as if settling into a fluid medium.
const VISCOUS_OUT = [0.22, 0.61, 0.36, 1] as const;

// Offsets relative to entranceEnd (when the crayfish lands). Claw zone ≈ x 40-58%, y 70-86%.
const CLAW_BUBBLES = [
  { x: "42%", y: "78%", size: 30, rise: 440, drift: -28, duration: 7.2, offset: 0.0 },
  { x: "50%", y: "74%", size: 20, rise: 500, drift: 4, duration: 8.0, offset: 1.1 },
  { x: "36%", y: "84%", size: 38, rise: 480, drift: -36, duration: 8.6, offset: 2.3 },
  { x: "56%", y: "78%", size: 16, rise: 440, drift: 16, duration: 7.6, offset: 3.5 },
  { x: "46%", y: "70%", size: 14, rise: 400, drift: -6, duration: 7.0, offset: 4.8 },
  { x: "52%", y: "82%", size: 24, rise: 460, drift: -12, duration: 8.2, offset: 6.1 },
] as const;

// Impact-bubbles cascade ~800ms during the fall. Offsets are relative to entranceDelay.
const IMPACT_BUBBLES = [
  { x: "50%", y: "78%", size: 20, rise: 150, drift: -10, duration: 2.0, offset: 0.2 },
  { x: "44%", y: "74%", size: 14, rise: 130, drift: -18, duration: 2.1, offset: 0.4 },
  { x: "54%", y: "72%", size: 24, rise: 180, drift: -2, duration: 2.2, offset: 0.6 },
  { x: "48%", y: "82%", size: 12, rise: 120, drift: 8, duration: 2.0, offset: 0.8 },
  { x: "52%", y: "76%", size: 16, rise: 160, drift: 2, duration: 2.1, offset: 1.0 },
] as const;

type HeroCrayfishStageProps = {
  entranceDelay?: number;
  entranceDuration?: number;
  idleDelay?: number;
};

export function HeroCrayfishStage({
  entranceDelay = 0.6,
  entranceDuration = 1.4,
  idleDelay = 5.06,
}: HeroCrayfishStageProps) {
  const prefersReduced = useReducedMotion();
  const entranceEnd = entranceDelay + entranceDuration;

  return (
    <div className="hero-crayfish-scene" aria-hidden>
      <div className="hero-crayfish-light" />
      <div className="hero-crayfish-depth" />

      <motion.div
        className="hero-crayfish-entrance"
        initial={
          prefersReduced
            ? { opacity: 1, y: 0, rotate: 0, scale: 1 }
            : { opacity: 0.3, y: "-130vh", rotate: -8, scale: 0.88 }
        }
        animate={
          prefersReduced
            ? { opacity: 1, y: 0, rotate: 0, scale: 1 }
            : { opacity: 1, y: 0, rotate: 0, scale: 1 }
        }
        transition={{
          duration: prefersReduced ? 0.2 : entranceDuration,
          delay: prefersReduced ? 0 : entranceDelay,
          ease: VISCOUS_OUT,
          // Opacity fades in linearly from a partially-visible start so the
          // crayfish reads as already in motion when it enters the frame,
          // not as a stop-frame that only starts translating later.
          opacity: {
            duration: prefersReduced ? 0.2 : entranceDuration,
            delay: prefersReduced ? 0 : entranceDelay,
            ease: "linear",
          },
        }}
      >
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

          <div className="hero-claw-bubbles hero-claw-bubbles--impact">
            {IMPACT_BUBBLES.map((b, i) => (
              <motion.span
                key={`impact-${i}`}
                className="hero-bubble hero-bubble--impact"
                style={{ left: b.x, top: b.y, width: b.size, height: b.size }}
                initial={
                  prefersReduced
                    ? { opacity: 0.16, x: 0, y: 0, scale: 1 }
                    : { opacity: 0, x: 0, y: 0, scale: 0.28 }
                }
                animate={
                  prefersReduced
                    ? { opacity: 0.16 }
                    : {
                        opacity: [0, 0.78, 0],
                        x: [0, b.drift * 0.4, b.drift],
                        y: [0, -b.rise * 0.48, -b.rise],
                        scale: [0.32, 1.06, 1.2],
                      }
                }
                transition={{
                  duration: prefersReduced ? 0.2 : b.duration,
                  delay: prefersReduced ? 0 : entranceDelay + b.offset,
                  ease: [0.18, 0.78, 0.24, 1],
                  times: [0, 0.36, 1],
                }}
              />
            ))}
          </div>

          <div className="hero-claw-bubbles">
            {CLAW_BUBBLES.map((b, i) => (
              <motion.span
                key={`claw-${i}`}
                className="hero-bubble hero-bubble--claw"
                style={{ left: b.x, top: b.y, width: b.size, height: b.size }}
                initial={
                  prefersReduced
                    ? { opacity: 0.18, x: 0, y: 0, scale: 1 }
                    : { opacity: 0, x: 0, y: 0, scale: 0.36 }
                }
                animate={
                  prefersReduced
                    ? { opacity: 0.18 }
                    : {
                        opacity: [0, 0.96, 0.78, 0.24, 0],
                        x: [0, b.drift * 0.25, b.drift * 0.55, b.drift * 0.85, b.drift],
                        y: [0, -b.rise * 0.22, -b.rise * 0.5, -b.rise * 0.78, -b.rise],
                        scale: [0.36, 0.9, 1.08, 1.18, 1.24],
                      }
                }
                transition={
                  prefersReduced
                    ? { duration: 0.2 }
                    : {
                        duration: b.duration,
                        delay: entranceEnd + b.offset,
                        ease: [0.22, 0.68, 0.22, 1],
                        times: [0, 0.18, 0.48, 0.8, 1],
                        repeat: Number.POSITIVE_INFINITY,
                        repeatDelay: 0,
                      }
                }
              />
            ))}
          </div>
        </motion.div>
      </motion.div>

      <div className="hero-crayfish-veil" />
    </div>
  );
}

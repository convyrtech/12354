"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const IMPACT_BUBBLES = [
  { left: "50%", top: "90%", size: 12, rise: 62, drift: -10, duration: 1.82, delay: 2.06 },
  { left: "56%", top: "86%", size: 18, rise: 84, drift: -6, duration: 1.96, delay: 2.1 },
  { left: "62%", top: "82%", size: 16, rise: 88, drift: -1, duration: 2.04, delay: 2.16 },
  { left: "68%", top: "78%", size: 12, rise: 76, drift: 5, duration: 1.92, delay: 2.22 },
] as const;

const DRIFT_BUBBLES = [
  { left: "48%", top: "92%", size: 10, rise: 78, drift: -8, duration: 6.6, delay: 2.64 },
  { left: "54%", top: "82%", size: 14, rise: 94, drift: -5, duration: 7.2, delay: 2.82 },
  { left: "60%", top: "70%", size: 18, rise: 110, drift: -2, duration: 7.8, delay: 3.0 },
  { left: "64%", top: "58%", size: 16, rise: 108, drift: 1, duration: 7.6, delay: 3.18 },
  { left: "68%", top: "46%", size: 12, rise: 96, drift: 4, duration: 7.1, delay: 3.34 },
  { left: "72%", top: "34%", size: 10, rise: 84, drift: 7, duration: 6.7, delay: 3.5 },
] as const;

export function HeroCrayfishStage() {
  const prefersReduced = useReducedMotion();

  return (
    <div className="hero-crayfish-scene" aria-hidden>
      <div className="hero-crayfish-light" />
      <div className="hero-crayfish-depth" />

      <motion.div
        className="hero-crayfish-entrance"
        initial={
          prefersReduced
            ? { opacity: 1, x: 0, y: 0, rotate: -8, scale: 1 }
            : { opacity: 0, x: "2.8vw", y: "-46vh", rotate: -2, scale: 0.88 }
        }
        animate={
          prefersReduced
            ? { opacity: 1, x: 0, y: 0, rotate: -8, scale: 1 }
            : {
                opacity: [0, 1, 1],
                x: ["2.8vw", "0.7vw", "0vw"],
                y: ["-46vh", "1.2vh", "0vh"],
                rotate: [-2, -7.2, -6.4],
                scale: [0.88, 1.015, 1],
              }
        }
        transition={{
          duration: prefersReduced ? 0.2 : 3.24,
          delay: prefersReduced ? 0 : 0.06,
          ease: [0.16, 0.82, 0.24, 1],
          times: prefersReduced ? undefined : [0, 0.84, 1],
        }}
      >
        <motion.div
          className="hero-crayfish-drift"
          animate={
            prefersReduced
              ? undefined
              : { x: [0, -1.5, 0], y: [0, -5, 0], rotate: [0, 0.6, 0] }
          }
          transition={
            prefersReduced
              ? undefined
              : {
                  duration: 11.2,
                  delay: 3.5,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }
          }
        >
          <motion.div
            className="hero-impact"
            initial={
              prefersReduced ? { opacity: 0.16 } : { opacity: 0, scale: 0.7, y: 16 }
            }
            animate={
              prefersReduced ? { opacity: 0.16 } : { opacity: 1, scale: 1, y: 0 }
            }
            transition={{
              duration: 1.14,
              delay: prefersReduced ? 0 : 2,
              ease: [0.2, 0.75, 0.25, 1],
            }}
          >
            <motion.span
              className="hero-impact__wash"
              initial={prefersReduced ? { opacity: 0.2 } : { opacity: 0, scaleX: 0.48, scaleY: 0.7 }}
              animate={
                prefersReduced
                  ? { opacity: 0.2 }
                  : { opacity: [0, 0.4, 0.05], scaleX: [0.48, 1.02, 1.14], scaleY: [0.7, 1, 1.06] }
              }
              transition={{
                duration: 1.64,
                delay: prefersReduced ? 0 : 2.08,
                ease: [0.2, 0.75, 0.25, 1],
                times: [0, 0.42, 1],
              }}
            />
            <motion.span
              className="hero-impact__ring hero-impact__ring--outer"
              initial={
                prefersReduced ? { opacity: 0.16, scaleX: 1, scaleY: 1 } : { opacity: 0, scaleX: 0.32, scaleY: 0.42 }
              }
              animate={
                prefersReduced
                  ? { opacity: 0.16 }
                  : { opacity: [0, 0.32, 0], scaleX: [0.32, 1.04, 1.3], scaleY: [0.42, 1, 1.22] }
              }
              transition={{
                duration: 1.52,
                delay: prefersReduced ? 0 : 2.18,
                ease: [0.2, 0.75, 0.25, 1],
                times: [0, 0.36, 1],
              }}
            />
            <motion.span
              className="hero-impact__ring hero-impact__ring--inner"
              initial={
                prefersReduced ? { opacity: 0.12, scaleX: 1, scaleY: 1 } : { opacity: 0, scaleX: 0.28, scaleY: 0.36 }
              }
              animate={
                prefersReduced
                  ? { opacity: 0.12 }
                  : { opacity: [0, 0.24, 0], scaleX: [0.28, 0.74, 1.04], scaleY: [0.36, 0.8, 1] }
              }
              transition={{
                duration: 1.36,
                delay: prefersReduced ? 0 : 2.28,
                ease: [0.2, 0.75, 0.25, 1],
                times: [0, 0.38, 1],
              }}
            />
          </motion.div>

          <div className="hero-impact-bubbles">
            {IMPACT_BUBBLES.map((bubble, index) => (
              <motion.span
                key={`impact-${bubble.left}-${bubble.top}-${bubble.size}-${index}`}
                className="hero-bubble hero-bubble--impact"
                style={{
                  left: bubble.left,
                  top: bubble.top,
                  width: bubble.size,
                  height: bubble.size,
                }}
                initial={
                  prefersReduced
                    ? { opacity: 0.14, x: 0, y: 0, scale: 1 }
                    : { opacity: 0, x: 0, y: 0, scale: 0.3 }
                }
                animate={
                  prefersReduced
                    ? { opacity: 0.14 }
                    : {
                        opacity: [0, 0.82, 0],
                        x: [0, bubble.drift * 0.4, bubble.drift],
                        y: [0, -bubble.rise * 0.48, -bubble.rise],
                        scale: [0.34, 1.08, 1.18],
                      }
                }
                transition={{
                  duration: prefersReduced ? 0.2 : bubble.duration,
                  delay: prefersReduced ? 0 : bubble.delay,
                  ease: [0.18, 0.78, 0.24, 1],
                  times: [0, 0.34, 1],
                }}
              />
            ))}
          </div>

          <div className="hero-bubble-stream">
            {DRIFT_BUBBLES.map((bubble, index) => (
              <motion.span
                key={`drift-${bubble.left}-${bubble.top}-${bubble.size}-${index}`}
                className="hero-bubble"
                style={{
                  left: bubble.left,
                  top: bubble.top,
                  width: bubble.size,
                  height: bubble.size,
                }}
                initial={
                  prefersReduced
                    ? { opacity: 0.14, x: 0, y: 0, scale: 1 }
                    : { opacity: 0.04, x: 0, y: 0, scale: 0.42 }
                }
                animate={
                  prefersReduced
                    ? { opacity: 0.14 }
                    : {
                        opacity: [0.24, 0.7, 0.22],
                        x: [0, bubble.drift * 0.5, bubble.drift],
                        y: [0, -bubble.rise * 0.54, -bubble.rise],
                        scale: [0.48, 1.04, 1.12],
                      }
                }
                transition={
                  prefersReduced
                    ? { duration: 0.2 }
                    : {
                        duration: bubble.duration,
                        delay: bubble.delay,
                        ease: "easeOut",
                        times: [0, 0.28, 1],
                        repeat: Number.POSITIVE_INFINITY,
                        repeatDelay: 1.36 + index * 0.2,
                      }
                }
              />
            ))}
          </div>

          <div className="hero-crayfish-asset">
            <Image
              src="/editorial/hero-crayfish-fall.png"
              alt=""
              fill
              priority
              sizes="(max-width: 767px) 72vw, (max-width: 1279px) 34vw, 420px"
              className="hero-crayfish-image"
            />
          </div>
        </motion.div>
      </motion.div>

      <div className="hero-crayfish-veil" />
    </div>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HeroCrayfishStage } from "@/components/hero/hero-crayfish-stage";

export function Hero() {
  const prefersReduced = useReducedMotion();
  const topLineDelay = prefersReduced ? 0 : 1.02;
  const bottomLineDelay = prefersReduced ? 0.16 : 1.92;
  const accentDelay = bottomLineDelay + 0.18;

  return (
    <section
      id="top"
      className="hero-stage"
      style={{
        position: "relative",
        overflow: "clip",
      }}
    >
      <div className="hero-water" aria-hidden>
        <div className="hero-water__base" />
        <div className="hero-water__caustic hero-water__caustic--a" />
        <div className="hero-water__caustic hero-water__caustic--b" />
        <div className="hero-water__falloff" />
        <div className="hero-water__noise" />
      </div>

      <HeroCrayfishStage />

      <div className="hero-copy-shell">
        <div className="hero-copy">
          <div className="hero-title-wrap">
            <motion.span
              className="hero-title-ripple hero-title-ripple--primary"
              initial={
                prefersReduced
                  ? { opacity: 0.08, scaleX: 1, scaleY: 1 }
                  : { opacity: 0, scaleX: 0.54, scaleY: 0.5, y: 18 }
              }
              animate={
                prefersReduced
                  ? { opacity: 0.08 }
                  : {
                      opacity: [0, 0.18, 0.04],
                      scaleX: [0.54, 1, 1.1],
                      scaleY: [0.5, 1, 1.04],
                      y: [18, 0, -4],
                    }
              }
              transition={{
                duration: 1.72,
                delay: topLineDelay + 0.22,
                ease: [0.18, 0.78, 0.24, 1],
                times: [0, 0.38, 1],
              }}
            />

            <motion.span
              className="hero-title-ripple hero-title-ripple--secondary"
              initial={
                prefersReduced
                  ? { opacity: 0.06, scaleX: 1, scaleY: 1 }
                  : { opacity: 0, scaleX: 0.46, scaleY: 0.38, y: 16 }
              }
              animate={
                prefersReduced
                  ? { opacity: 0.06 }
                  : {
                      opacity: [0, 0.15, 0.035],
                      scaleX: [0.46, 0.92, 1.04],
                      scaleY: [0.38, 0.86, 0.94],
                      y: [16, 0, -3],
                    }
              }
              transition={{
                duration: 1.92,
                delay: bottomLineDelay + 0.28,
                ease: [0.18, 0.78, 0.24, 1],
                times: [0, 0.4, 1],
              }}
            />

            <motion.span
              className="hero-title-sheen"
              initial={
                prefersReduced
                  ? { opacity: 0.05, x: 0 }
                  : { opacity: 0, x: -12 }
              }
              animate={
                prefersReduced
                  ? { opacity: 0.05 }
                  : { opacity: [0, 0.11, 0.03], x: [-12, 0, 8] }
              }
              transition={{
                duration: 1.88,
                delay: bottomLineDelay + 0.34,
                ease: [0.22, 0.75, 0.25, 1],
                times: [0, 0.46, 1],
              }}
            />

            <h1
              className="hero-title"
              aria-label="Вкус, после которого всё остальное звучит тише."
            >
              <span className="hero-line hero-line--top">
                <motion.span
                  className="hero-title__line-wrap hero-title__line-wrap--top"
                  initial={
                    prefersReduced
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          y: 26,
                          scaleY: 1.03,
                          filter: "blur(2.4px)",
                          clipPath: "inset(0 0 100% 0)",
                        }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                    scaleY: 1,
                    filter: "blur(0px)",
                    clipPath: "inset(0 0 0% 0)",
                  }}
                  transition={{
                    duration: 1.54,
                    delay: topLineDelay,
                    ease: [0.18, 0.78, 0.24, 1],
                  }}
                >
                  <span className="hero-title__wave hero-title__wave--top">
                    {"Вкус, после "}
                    <br className="hero-break hero-break--mobile" />
                    {"которого"}
                  </span>
                </motion.span>
              </span>

              <span className="hero-line hero-line--bottom">
                <motion.span
                  className="hero-title__line-wrap hero-title__line-wrap--bottom"
                  initial={
                    prefersReduced
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          y: 32,
                          scaleY: 1.04,
                          filter: "blur(3px)",
                          clipPath: "inset(0 0 100% 0)",
                        }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                    scaleY: 1,
                    filter: "blur(0px)",
                    clipPath: "inset(0 0 0% 0)",
                  }}
                  transition={{
                    duration: 1.82,
                    delay: bottomLineDelay,
                    ease: [0.18, 0.78, 0.24, 1],
                  }}
                >
                  <span className="hero-title__wave hero-title__wave--bottom">
                    {"всё остальное "}
                    <br className="hero-break hero-break--mobile" />
                    {"звучит "}
                    <motion.em
                      className="hero-title__accent"
                      initial={
                        prefersReduced
                          ? { opacity: 1, y: 0, filter: "blur(0px)" }
                          : { opacity: 0, y: 8, filter: "blur(2px)" }
                      }
                      animate={{
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                      }}
                      transition={{
                        duration: 1.04,
                        delay: accentDelay,
                        ease: [0.18, 0.78, 0.24, 1],
                      }}
                    >
                      {"тише."}
                    </motion.em>
                  </span>
                </motion.span>
              </span>
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
}

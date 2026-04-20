"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { HeroCrayfishStage } from "@/components/hero/hero-crayfish-stage";
import { HeroBubbles } from "@/components/hero/hero-bubbles";
import {
  HeroLineRipple,
  type HeroLineRippleHandle,
} from "@/components/sections/hero/HeroLineRipple";

// Quart-out — sits between cubic (too mushy) and expo (too snappy).
// Quicker start than cubic, softer tail than expo.
const QUART_OUT = [0.25, 1, 0.5, 1] as const;

const WORD_STAGGER = 0.18;
const WORD_DURATION = 1.4;
const WORD_BLUR_START = 14;

const FIRST_LINE_DELAY = 0.1;
const FIRST_LINE_WORDS = ["Вкус,", "после", "которого"] as const;

const CRAYFISH_ENTRANCE_DELAY = 0.6;
const CRAYFISH_ENTRANCE_DURATION = 2.4;
const CRAYFISH_SETTLED_AT = CRAYFISH_ENTRANCE_DELAY + CRAYFISH_ENTRANCE_DURATION;
// Idle breathing kicks in just after the body finishes its damped settle.
const CRAYFISH_IDLE_DELAY = CRAYFISH_SETTLED_AT + 0.2;
// Phase-3 bubbles start after the post-landing tail-off (+0.7s) plus a breath.
const BUBBLES_PHASE3_DELAY = CRAYFISH_SETTLED_AT + 0.9;

const SECOND_LINE_DELAY = 0.8;
const SECOND_LINE_WORDS = ["всё", "остальное", "звучит"] as const;
const ACCENT_INDEX = SECOND_LINE_WORDS.length;
const LAST_WORD_DELAY = SECOND_LINE_DELAY + ACCENT_INDEX * WORD_STAGGER;

// Single ripple — on line 2, centred on <em>тише</em>.
// Fires 100ms before «тише.» appears, so the word literally emerges through
// the expanding wavefront.
const RIPPLE_TRIGGER = LAST_WORD_DELAY - 0.1;
const RIPPLE_DURATION = 1.2;

export function Hero() {
  const prefersReduced = useReducedMotion();

  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const line2Ref = useRef<HTMLSpanElement | null>(null);
  const emRef = useRef<HTMLElement | null>(null);
  const rippleRef = useRef<HeroLineRippleHandle>(null);

  useEffect(() => {
    if (prefersReduced) return;
    const timer = window.setTimeout(() => {
      rippleRef.current?.drop();
    }, Math.round(RIPPLE_TRIGGER * 1000));
    return () => window.clearTimeout(timer);
  }, [prefersReduced]);

  const wordInitial = prefersReduced
    ? { opacity: 1, y: 0, filter: "blur(0px)" }
    : { opacity: 0, y: 36, filter: `blur(${WORD_BLUR_START}px)` };
  const wordAnimate = { opacity: 1, y: 0, filter: "blur(0px)" };

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

      <motion.div
        className="hero-poster-title"
        aria-hidden
        initial={
          prefersReduced
            ? { opacity: 1, filter: "blur(0px)" }
            : { opacity: 0, filter: "blur(24px)" }
        }
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{
          duration: prefersReduced ? 0 : 1.6,
          delay: 0,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        The <em>Raki</em>
      </motion.div>

      <HeroCrayfishStage
        entranceDelay={CRAYFISH_ENTRANCE_DELAY}
        entranceDuration={CRAYFISH_ENTRANCE_DURATION}
        idleDelay={CRAYFISH_IDLE_DELAY}
        frontOverlay={
          <HeroBubbles
            entranceDelay={CRAYFISH_ENTRANCE_DELAY}
            entranceDuration={CRAYFISH_ENTRANCE_DURATION}
            idleStartDelay={BUBBLES_PHASE3_DELAY}
            density={0.25}
            variant="front"
          />
        }
      >
        <HeroBubbles
          entranceDelay={CRAYFISH_ENTRANCE_DELAY}
          entranceDuration={CRAYFISH_ENTRANCE_DURATION}
          idleStartDelay={BUBBLES_PHASE3_DELAY}
          variant="back"
        />
      </HeroCrayfishStage>

      <div className="hero-grain" aria-hidden />

      <div className="hero-poster">
        <div className="hero-title-stage">
          <h1
            ref={titleRef}
            className="hero-title"
            aria-label="Вкус, после которого всё остальное звучит тише."
          >
            <span className="hero-line hero-line--top">
              {FIRST_LINE_WORDS.map((word, index) => {
                const isLast = index === FIRST_LINE_WORDS.length - 1;
                return (
                  <motion.span
                    key={`top-${index}`}
                    className="hero-title__word hero-title__word--top"
                    initial={wordInitial}
                    animate={wordAnimate}
                    transition={{
                      duration: prefersReduced ? 0 : WORD_DURATION,
                      delay: prefersReduced
                        ? 0
                        : FIRST_LINE_DELAY + index * WORD_STAGGER,
                      ease: QUART_OUT,
                    }}
                  >
                    {word}
                    {isLast ? "" : "\u00A0"}
                  </motion.span>
                );
              })}
            </span>

            <span
              ref={line2Ref}
              className="hero-line hero-line--bottom"
            >
              {SECOND_LINE_WORDS.map((word, index) => (
                <motion.span
                  key={`bottom-${index}`}
                  className="hero-title__word hero-title__word--bottom"
                  initial={wordInitial}
                  animate={wordAnimate}
                  transition={{
                    duration: prefersReduced ? 0 : WORD_DURATION,
                    delay: prefersReduced
                      ? 0
                      : SECOND_LINE_DELAY + index * WORD_STAGGER,
                    ease: QUART_OUT,
                  }}
                >
                  {word}
                  {"\u00A0"}
                </motion.span>
              ))}

              <motion.em
                ref={emRef}
                className="hero-title__accent hero-title__word hero-title__word--bottom"
                initial={wordInitial}
                animate={wordAnimate}
                transition={{
                  duration: prefersReduced ? 0 : WORD_DURATION,
                  delay: prefersReduced ? 0 : LAST_WORD_DELAY,
                  ease: QUART_OUT,
                }}
              >
                тише.
              </motion.em>
            </span>
          </h1>
        </div>
      </div>

      <HeroLineRipple
        ref={rippleRef}
        targetRef={titleRef}
        centerRef={emRef}
        filterId="hero-ripple-line2"
        duration={RIPPLE_DURATION * 1000}
        waveWidth={180}
        amplitude={48}
        maxRadiusFactor={1.0}
      />
    </section>
  );
}

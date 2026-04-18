"use client";

import { Fragment, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const HEADING_LINES = [
  ["С", "2017-го"],
  ["варим", "живых", "раков"],
  ["и", "контролируем", "каждый", "шаг", "—"],
  ["от", "реки", "до", "стола."],
] as const;

const SUBTITLE_LINES = [
  "Только живые раки. Только лучшие продукты.",
  "Никаких компромиссов между «на кухне» и «у вас дома».",
] as const;

const DIVIDER = "*   *   *";

const WORD_STAGGER = 0.12;
const WORD_DURATION = 0.8;
const EXPO_OUT = [0.16, 1, 0.3, 1] as const;

const SUBTITLE_GAP = 0.2;
const SUBTITLE_DURATION = 0.6;
const DIVIDER_DURATION = 0.4;

const TOTAL_WORDS = HEADING_LINES.reduce((sum, line) => sum + line.length, 0);
const HEADING_END = (TOTAL_WORDS - 1) * WORD_STAGGER + WORD_DURATION;
const SUBTITLE_DELAY = HEADING_END + SUBTITLE_GAP;

const POSTER_STACK = 'var(--font-poster), var(--font-display), "Cormorant Garamond", serif';
const TEXT_PRIMARY_RGB = "242, 232, 213";

const sectionStyle = {
  marginTop: "clamp(120px, 18vh, 240px)",
  paddingInline: "clamp(24px, 5vw, 48px)",
  textAlign: "center" as const,
  position: "relative" as const,
};

const dividerBaseStyle = {
  fontFamily: "var(--font-sans), sans-serif",
  fontSize: "clamp(11px, 0.9vw, 13px)",
  letterSpacing: "0.8em",
  textTransform: "uppercase" as const,
  color: `rgba(${TEXT_PRIMARY_RGB}, 0.4)`,
  willChange: "opacity",
};

const topDividerStyle = {
  ...dividerBaseStyle,
  marginBottom: "clamp(80px, 10vh, 140px)",
};

const bottomDividerStyle = {
  ...dividerBaseStyle,
  marginTop: "clamp(80px, 10vh, 140px)",
};

const headingStyle = {
  fontFamily: POSTER_STACK,
  fontStyle: "italic" as const,
  fontWeight: 400,
  fontSize: "clamp(40px, 5vw, 72px)",
  lineHeight: 1.2,
  color: "var(--text-primary)",
  margin: 0,
};

const wordSpanStyle = {
  display: "inline-block",
  willChange: "opacity, transform, filter",
};

const subtitleStyle = {
  marginTop: "clamp(40px, 6vh, 80px)",
  marginInline: "auto",
  marginBottom: 0,
  maxWidth: "52ch",
  fontFamily: POSTER_STACK,
  fontStyle: "normal" as const,
  fontWeight: 400,
  fontSize: "clamp(18px, 1.5vw, 22px)",
  lineHeight: 1.5,
  color: `rgba(${TEXT_PRIMARY_RGB}, 0.7)`,
};

export function BrandStory() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const prefersReduced = useReducedMotion();
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });
  const active = prefersReduced || isInView;

  const wordInitial = prefersReduced
    ? { opacity: 1, y: 0, filter: "blur(0px)" }
    : { opacity: 0, y: 20, filter: "blur(6px)" };
  const wordAnimate = { opacity: 1, y: 0, filter: "blur(0px)" };

  const dividerInitial = prefersReduced ? { opacity: 0.4 } : { opacity: 0 };
  const dividerAnimate = { opacity: 0.4 };

  const subtitleInitial = prefersReduced
    ? { opacity: 1, y: 0 }
    : { opacity: 0, y: 15 };
  const subtitleAnimate = { opacity: 1, y: 0 };

  let wordIndex = 0;

  return (
    <section id="brand-story" ref={sectionRef} style={sectionStyle}>
      <motion.div
        style={topDividerStyle}
        initial={dividerInitial}
        animate={active ? dividerAnimate : dividerInitial}
        transition={{ duration: prefersReduced ? 0 : DIVIDER_DURATION }}
        aria-hidden
      >
        {DIVIDER}
      </motion.div>

      <h2 style={headingStyle}>
        {HEADING_LINES.map((line, li) => (
          <Fragment key={li}>
            {line.map((word, wi) => {
              const delay = prefersReduced ? 0 : wordIndex * WORD_STAGGER;
              wordIndex += 1;
              const isLast = wi === line.length - 1;
              return (
                <motion.span
                  key={wi}
                  style={wordSpanStyle}
                  initial={wordInitial}
                  animate={active ? wordAnimate : wordInitial}
                  transition={{
                    duration: prefersReduced ? 0 : WORD_DURATION,
                    delay,
                    ease: EXPO_OUT,
                  }}
                >
                  {word}
                  {isLast ? "" : "\u00A0"}
                </motion.span>
              );
            })}
            {li < HEADING_LINES.length - 1 && <br />}
          </Fragment>
        ))}
      </h2>

      <motion.p
        style={subtitleStyle}
        initial={subtitleInitial}
        animate={active ? subtitleAnimate : subtitleInitial}
        transition={{
          duration: prefersReduced ? 0 : SUBTITLE_DURATION,
          delay: prefersReduced ? 0 : SUBTITLE_DELAY,
          ease: EXPO_OUT,
        }}
      >
        {SUBTITLE_LINES[0]}
        <br />
        {SUBTITLE_LINES[1]}
      </motion.p>

      <motion.div
        style={bottomDividerStyle}
        initial={dividerInitial}
        animate={active ? dividerAnimate : dividerInitial}
        transition={{ duration: prefersReduced ? 0 : DIVIDER_DURATION }}
        aria-hidden
      >
        {DIVIDER}
      </motion.div>
    </section>
  );
}

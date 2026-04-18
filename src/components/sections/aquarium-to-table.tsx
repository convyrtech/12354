"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

const HEADING_LINE_1 = ["От", "аквариума", "до", "стола\u00A0—"] as const;
const HEADING_LINE_2 = ["не", "больше", "двух", "часов."] as const;

const WORD_STAGGER = 0.12;
const WORD_DURATION = 0.8;
const EXPO_OUT = [0.16, 1, 0.3, 1] as const;

const EYEBROW_DURATION = 0.5;
const EYEBROW_DELAY = 0.05;
const SUB_GAP = 0.2;
const SUB_DURATION = 0.6;

const POSTER_STACK =
  'var(--font-poster), var(--font-display), "Cormorant Garamond", serif';
const SANS_STACK = "var(--font-sans), sans-serif";

const TOTAL_WORDS = HEADING_LINE_1.length + HEADING_LINE_2.length;
const HEADING_END = (TOTAL_WORDS - 1) * WORD_STAGGER + WORD_DURATION;
const SUB_DELAY = HEADING_END + SUB_GAP;

const creamInnerStyle = {
  position: "relative" as const,
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingInline: "clamp(24px, 5vw, 48px)",
};

const eyebrowStyle = {
  position: "absolute" as const,
  top: "clamp(24px, 4vh, 48px)",
  left: "clamp(24px, 5vw, 48px)",
  fontFamily: SANS_STACK,
  fontSize: "clamp(11px, 0.9vw, 12px)",
  letterSpacing: "0.3em",
  textTransform: "uppercase" as const,
  color: "var(--text-on-cream-muted)",
  willChange: "opacity",
};

const headingStyle = {
  fontFamily: POSTER_STACK,
  fontWeight: 400,
  fontStyle: "normal" as const,
  fontSize: "clamp(44px, 6vw, 84px)",
  lineHeight: 1.05,
  color: "var(--text-on-cream)",
  textAlign: "center" as const,
  margin: 0,
};

const italicStyle = {
  fontStyle: "italic" as const,
  color: "var(--accent-cream)",
};

const wordSpanStyle = {
  display: "inline-block" as const,
  willChange: "opacity, transform, filter",
};

const subStyle = {
  marginTop: "clamp(32px, 4vh, 56px)",
  marginBottom: 0,
  fontFamily: SANS_STACK,
  fontSize: "clamp(13px, 1vw, 14px)",
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  color: "var(--text-on-cream-muted)",
  textAlign: "center" as const,
  willChange: "opacity",
};

type AquariumToTableProps = {
  children: ReactNode;
};

export function AquariumToTable({ children }: AquariumToTableProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const prefersReduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [textActive, setTextActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const useFallback = Boolean(prefersReduced) || isMobile;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    mass: 0.6,
  });

  const heroRotateX3D = useTransform(smooth, [0, 0.33], [0, -95]);
  const heroY3D = useTransform(smooth, [0, 0.33], ["0%", "-6%"]);
  const heroOpacity3D = useTransform(smooth, [0, 0.28, 0.33], [1, 1, 0]);
  const creamY3D = useTransform(
    smooth,
    [0, 0.33, 0.66, 1],
    ["100%", "0%", "0%", "-8%"],
  );
  const creamRotateX3D = useTransform(smooth, [0.66, 1], [0, -95]);
  const creamOpacity3D = useTransform(smooth, [0, 0.92, 1], [1, 1, 0]);
  const creamShadowOpacity = useTransform(
    smooth,
    [0.05, 0.2, 0.33],
    [0, 0.3, 0],
  );
  const creamBoxShadow3D = useMotionTemplate`0 -30px 60px rgba(0, 0, 0, ${creamShadowOpacity})`;

  const heroOpacityFB = useTransform(smooth, [0, 0.2], [1, 0]);
  const creamYFB = useTransform(
    smooth,
    [0, 0.15, 0.35, 0.8, 1],
    [30, 30, 0, 0, -30],
  );
  const creamOpacityFB = useTransform(
    smooth,
    [0, 0.15, 0.35, 0.8, 1],
    [0, 0, 1, 1, 0],
  );

  useMotionValueEvent(smooth, "change", (v) => {
    if (!textActive && v >= 0.35) setTextActive(true);
    // Signal to body-scoped CSS that a cream surface now dominates the viewport,
    // so fixed overlays (e.g. the home-menu trigger) can swap to a cream palette.
    if (typeof document === "undefined") return;
    const creamVisible = v >= 0.28 && v <= 0.72;
    const current = document.body.dataset.surface;
    if (creamVisible && current !== "cream") {
      document.body.dataset.surface = "cream";
    } else if (!creamVisible && current === "cream") {
      delete document.body.dataset.surface;
    }
  });

  useEffect(() => {
    if (prefersReduced) setTextActive(true);
  }, [prefersReduced]);

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined" && document.body.dataset.surface === "cream") {
        delete document.body.dataset.surface;
      }
    };
  }, []);

  const wordInitial = prefersReduced
    ? { opacity: 1, y: 0, filter: "blur(0px)" }
    : { opacity: 0, y: 20, filter: "blur(6px)" };
  const wordAnimate = { opacity: 1, y: 0, filter: "blur(0px)" };
  const fadeInitial = prefersReduced ? { opacity: 1 } : { opacity: 0 };

  let wordIndex = 0;
  const renderWord = (word: string) => {
    const delay = prefersReduced ? 0 : wordIndex * WORD_STAGGER;
    wordIndex += 1;
    return (
      <motion.span
        style={wordSpanStyle}
        initial={wordInitial}
        animate={textActive ? wordAnimate : wordInitial}
        transition={{
          duration: prefersReduced ? 0 : WORD_DURATION,
          delay,
          ease: EXPO_OUT,
        }}
      >
        {word}
      </motion.span>
    );
  };

  const heroStyle = useFallback
    ? { opacity: heroOpacityFB }
    : { rotateX: heroRotateX3D, y: heroY3D, opacity: heroOpacity3D };

  const creamStyle = useFallback
    ? { y: creamYFB, opacity: creamOpacityFB }
    : {
        y: creamY3D,
        rotateX: creamRotateX3D,
        opacity: creamOpacity3D,
        boxShadow: creamBoxShadow3D,
      };

  return (
    <section
      ref={sectionRef}
      className="aquarium-to-table"
      style={{ position: "relative" }}
    >
      <div className="aquarium-to-table__pin">
        <motion.div
          className="aquarium-to-table__hero-layer"
          style={heroStyle}
        >
          {children}
        </motion.div>

        <motion.div
          className="aquarium-to-table__cream-layer"
          style={creamStyle}
        >
          <div style={creamInnerStyle}>
            <motion.span
              style={eyebrowStyle}
              initial={fadeInitial}
              animate={textActive ? { opacity: 1 } : fadeInitial}
              transition={{
                duration: prefersReduced ? 0 : EYEBROW_DURATION,
                delay: prefersReduced ? 0 : EYEBROW_DELAY,
                ease: EXPO_OUT,
              }}
            >
              — 02 —
            </motion.span>

            <h2 style={headingStyle}>
              {HEADING_LINE_1.map((word, i) => (
                <Fragment key={`l1-${i}`}>
                  {renderWord(word)}
                  {i < HEADING_LINE_1.length - 1 && " "}
                </Fragment>
              ))}
              <br />
              <em style={italicStyle}>
                {HEADING_LINE_2.map((word, i) => (
                  <Fragment key={`l2-${i}`}>
                    {renderWord(word)}
                    {i < HEADING_LINE_2.length - 1 && " "}
                  </Fragment>
                ))}
              </em>
            </h2>

            <motion.p
              style={subStyle}
              initial={fadeInitial}
              animate={textActive ? { opacity: 1 } : fadeInitial}
              transition={{
                duration: prefersReduced ? 0 : SUB_DURATION,
                delay: prefersReduced ? 0 : SUB_DELAY,
                ease: EXPO_OUT,
              }}
            >
              Живой · Горячий · На дом
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

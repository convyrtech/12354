"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTime,
  useTransform,
  type Variants,
} from "framer-motion";
import { useMatchMedia } from "@/hooks/use-match-media";
import { MENU_ENTRY, MENU_ENTRY_INFO } from "@/lib/homepage-data";

// ────────────────────────────────────────────────────────────────
// CTA finale — a cream "card" sitting on the dark body, carrying
// the full closing business of the homepage: invitation, contacts,
// press, wordmark. Two animation tiers:
//
//   1. Z-depth transition on the WHOLE CARD — picks up from
//      trusted-by's exit [0.85, 1.0] and drives the card's own
//      entrance [0, 0.5]:
//          scale   0.85 → 1
//          opacity 0    → 1
//          blur    8px  → 0
//          y       +80  → 0
//      Transforms live on the <motion.section> so the cream bg,
//      content, and rounded corners all recede/approach as one
//      slab. rAF pattern mirrors aquarium-to-table.tsx:113-135.
//
//   2. Stagger on the INFO BLOCK — once the card is in place and
//      the user scrolls to the info section:
//          separator → col1 → col2 → col3 → wordmark
//          each 150ms later, opacity 0→1 + y +20→0, 600ms ease-out.
//      Triggered by `useInView` on the info container with
//      { once: true, amount: 0.2 }.
//
// Typography underline under «начинается» — `useInView({ once })`
// on the emphasis span, scaleX 0→1 with origin: left, 800ms.
// ────────────────────────────────────────────────────────────────

const SPRING = { stiffness: 80, damping: 30, mass: 0.8 } as const;
const UNDERLINE_TRANSITION = { duration: 0.8, ease: "easeOut" as const };

const infoContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0 },
  },
};

const infoItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export function MenuEntry() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const emphasisRef = useRef<HTMLSpanElement | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useReducedMotion();
  const isDesktop = useMatchMedia(
    "(min-width: 1024px) and (min-height: 720px)",
  );

  const scrollYProgress = useMotionValue(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const el = sectionRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const p = Math.max(0, Math.min(1, (vh - rect.top) / vh));
        scrollYProgress.set(p);
      }
      raf = window.requestAnimationFrame(measure);
    };
    raf = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(raf);
  }, [scrollYProgress]);

  const smooth = useSpring(scrollYProgress, SPRING);

  const scale = useTransform(smooth, [0, 0.5], [isDesktop ? 0.85 : 1, 1]);
  const blurPx = useTransform(smooth, [0, 0.5], [isDesktop ? 8 : 0, 0]);
  const filter = useMotionTemplate`blur(${blurPx}px)`;
  const opacity = useTransform(smooth, [0, 0.5], [0, 1]);
  const y = useTransform(smooth, [0, 0.5], [isDesktop ? 80 : 40, 0]);

  const useMotion = !prefersReduced;

  const underlineInView = useInView(emphasisRef, {
    once: true,
    amount: 0.3,
  });
  const underlineDrawn = !useMotion || underlineInView;

  const infoInView = useInView(infoRef, { once: true, amount: 0.2 });
  // Reduced-motion: skip the stagger and render everything at rest.
  const infoAnimateState = !useMotion || infoInView ? "visible" : "hidden";

  // ───────────── Wind-on-water ripple on the «начинается» underline.
  // After the line has drawn, every 8–16s a wave burst sweeps across it
  // (amp 0→1→0 over 2.8s); between bursts it sits perfectly flat. The path
  // `d` attribute is rebuilt each frame from a motion-value combination of
  // elapsed time (useTime) and current amplitude — when amp is 0 we
  // short-circuit to a constant flat string, so the calm state costs
  // nothing.
  const windAmp = useMotionValue(0);
  const time = useTime();

  const windPathD = useTransform<number, string>(
    [time, windAmp],
    ([t, a]) => {
      if (a <= 0.001) return "M 0 5 L 100 5";
      const amp = a * 2.4;
      const k = 0.06;
      const omega = 0.012;
      const phase = omega * t;
      const env = (x: number) => Math.sin((Math.PI * x) / 100);
      const yAt = (x: number, off: number) =>
        5 + amp * env(x) * Math.sin(x * k - phase + off);

      const y1 = yAt(20, 0);
      const y2 = yAt(45, 1.2);
      const y3 = yAt(70, 2.4);
      const y4 = yAt(85, 3.6);

      return (
        `M 0 5 C 10 ${y1} 15 ${y1} 25 ${y1} ` +
        `S 45 ${y2} 50 ${y2} ` +
        `S 70 ${y3} 75 ${y3} ` +
        `S 95 ${y4} 100 5`
      );
    },
  );

  useEffect(() => {
    if (!useMotion || !underlineDrawn) return;
    let tid: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const schedule = () => {
      const wait = 8000 + Math.random() * 8000;
      tid = setTimeout(async () => {
        if (cancelled) return;
        await animate(windAmp, [0, 1, 0.6, 0.25, 0], {
          duration: 2.8,
          times: [0, 0.18, 0.5, 0.78, 1],
          ease: "easeOut",
        });
        if (!cancelled) schedule();
      }, wait);
    };
    schedule();

    return () => {
      cancelled = true;
      clearTimeout(tid);
    };
  }, [useMotion, underlineDrawn, windAmp]);

  const sectionStyle = useMotion
    ? { scale, opacity, filter, y, scrollMarginTop: 120 }
    : { scrollMarginTop: 120 };

  return (
    <motion.section
      ref={sectionRef}
      id="menu-entry"
      className="home-section menu-cta-section"
      style={sectionStyle}
    >
      <div className="menu-cta-block">
        <div className="menu-cta-block__cta-zone">
          <div className="menu-cta-block__text-col">
            <h2 className="menu-cta-block__headline">
              Ваш стол{" "}
              <span ref={emphasisRef} className="menu-cta-block__emphasis">
                начинается
                <motion.span
                  className="menu-cta-block__underline"
                  aria-hidden="true"
                  initial={{ scaleX: underlineDrawn ? 1 : 0 }}
                  animate={{ scaleX: underlineDrawn ? 1 : 0 }}
                  transition={UNDERLINE_TRANSITION}
                >
                  <svg
                    className="menu-cta-block__underline-svg"
                    viewBox="0 0 100 10"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <motion.path
                      d={windPathD}
                      stroke="var(--accent-cream)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </motion.span>
              </span>{" "}
              здесь.
            </h2>
          </div>

          <div className="menu-cta-block__cta-col">
            <Link
              href={MENU_ENTRY.cta.href}
              className="cta cta--editorial menu-cta-block__cta"
            >
              <span>{MENU_ENTRY.cta.label}</span>
              <span className="menu-cta-block__cta-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>

        <motion.div
          ref={infoRef}
          className="menu-cta-info"
          variants={infoContainerVariants}
          initial={useMotion ? "hidden" : "visible"}
          animate={infoAnimateState}
        >
          <motion.div
            className="menu-cta-info__separator"
            variants={infoItemVariants}
            aria-hidden="true"
          >
            <span className="menu-cta-info__separator-line" />
            <span className="menu-cta-info__separator-dots">· · ·</span>
            <span className="menu-cta-info__separator-line" />
          </motion.div>

          {MENU_ENTRY_INFO.columns.map((col, idx) => (
            <motion.div
              key={col.title}
              // Indexed modifier so CSS can align each column differently:
              // col 1 (Доставка) → left, col 2 (Контакты) → center,
              // col 3 (В прессе) → right, forming a balanced 3-part row.
              className={`menu-cta-info__col menu-cta-info__col--${idx + 1}`}
              style={{ gridArea: `c${idx + 1}` }}
              variants={infoItemVariants}
            >
              <h3 className="menu-cta-info__title">{col.title}</h3>
              {col.lines.map((line, lineIdx) => (
                <p key={lineIdx}>{line || "\u00A0"}</p>
              ))}
            </motion.div>
          ))}

          <motion.p
            className="menu-cta-info__wordmark"
            variants={infoItemVariants}
          >
            {MENU_ENTRY_INFO.wordmark}
          </motion.p>
        </motion.div>
      </div>
    </motion.section>
  );
}

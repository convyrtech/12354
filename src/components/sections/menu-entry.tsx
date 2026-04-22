"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
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
import { useSectionProgress } from "@/hooks/use-section-progress";
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

  const scrollYProgress = useSectionProgress(sectionRef, "enter");

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
      // 3.8 → peaks at ~38% of viewBox Y. Combined with the 16px
      // underline box (below in globals.css) this translates to ~6px
      // vertical displacement — reads clearly as a wave, not a wobble.
      const amp = a * 3.8;
      const k = 0.075;          // tighter spatial frequency → 2 crests visible
      const omega = 0.015;       // faster sweep → one oscillation ≈ 420ms
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

  // Fire one wave burst. Cooldown guard: if a wave is already playing
  // (windAmp > 0.001), the call is a no-op — no stacking, no jitter on
  // rapid re-triggers. Skipped entirely under reduced-motion.
  const triggerWindBurst = useCallback(() => {
    if (!useMotion) return;
    if (windAmp.get() > 0.001) return;
    animate(windAmp, [0, 1.15, 0.7, 0.3, 0], {
      // Slight over-peak (>1) for a decisive "gust hit", tightened to
      // 2.2s for a livelier, more noticeable sweep.
      duration: 2.2,
      times: [0, 0.18, 0.5, 0.78, 1],
      ease: "easeOut",
    });
  }, [useMotion, windAmp]);

  // Welcome burst — fires once, ~1s after the underline has drawn in.
  // The extra pause past the 800ms draw lets the card finish its
  // z-depth approach first, so the wave lands on a fully settled card.
  const welcomeFired = useRef(false);
  useEffect(() => {
    if (!useMotion) return;
    if (!underlineDrawn || welcomeFired.current) return;
    welcomeFired.current = true;
    const tid = setTimeout(triggerWindBurst, 1000);
    return () => clearTimeout(tid);
  }, [useMotion, underlineDrawn, triggerWindBurst]);

  // ───────────── Magnetic hover on the «К меню» pill.
  // When the cursor enters a 160px radius around the pill's visual
  // center, the pill is pulled toward it at ~35% strength with
  // quadratic falloff — strong near center, gentle at the activation
  // edge, zero outside. Spring-smoothed so it reads as a weighty
  // object leaning toward the cursor, not a jittery tracker.
  // Desktop + pointer-fine only; reduced-motion skips entirely.
  const pillMagneticRef = useRef<HTMLDivElement | null>(null);
  const pointerFine = useMatchMedia("(pointer: fine)");
  const magneticX = useMotionValue(0);
  const magneticY = useMotionValue(0);
  const magneticSpringX = useSpring(magneticX, {
    stiffness: 220,
    damping: 22,
    mass: 0.6,
  });
  const magneticSpringY = useSpring(magneticY, {
    stiffness: 220,
    damping: 22,
    mass: 0.6,
  });

  useEffect(() => {
    if (!useMotion || !pointerFine) return;
    const el = pillMagneticRef.current;
    const section = sectionRef.current;
    if (!el || !section) return;

    const RADIUS = 160;
    const STRENGTH = 0.35;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > RADIUS) {
        magneticX.set(0);
        magneticY.set(0);
        return;
      }
      // Quadratic falloff: 1 at center, 0 at edge, smooth in between.
      const falloff = 1 - (d / RADIUS) ** 2;
      const pull = STRENGTH * falloff;
      magneticX.set(dx * pull);
      magneticY.set(dy * pull);
    };

    // Gate the global mousemove listener on CTA visibility — without this
    // every mouse twitch during hero/aquarium/brand-story scroll (where the
    // pill sits 3000-6000px below the viewport) invokes getBoundingClientRect
    // for nothing. Mirrors the pattern in aquarium-to-table.tsx:358-380.
    let attached = false;
    const attach = () => {
      if (attached) return;
      attached = true;
      window.addEventListener("mousemove", onMove, { passive: true });
    };
    const detach = () => {
      if (!attached) return;
      attached = false;
      window.removeEventListener("mousemove", onMove);
      magneticX.set(0);
      magneticY.set(0);
    };
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? attach() : detach()),
      { rootMargin: "200px" },
    );
    io.observe(section);
    return () => {
      io.disconnect();
      detach();
    };
  }, [useMotion, pointerFine, magneticX, magneticY]);

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
              <span
                ref={emphasisRef}
                className="menu-cta-block__emphasis"
                onMouseEnter={triggerWindBurst}
              >
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
            <motion.div
              ref={pillMagneticRef}
              style={{ x: magneticSpringX, y: magneticSpringY }}
            >
              <Link
                href={MENU_ENTRY.cta.href}
                className="cta cta--editorial menu-cta-block__cta"
              >
                <span>{MENU_ENTRY.cta.label}</span>
                <span className="menu-cta-block__cta-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </motion.div>
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

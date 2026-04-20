"use client";

import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

// ---------------------------------------------------------------------------
// Content — identical between cinematic and stacked fallback.
// ---------------------------------------------------------------------------

const HEADING_LINES = [
  ["С", "2017", "года"],
  ["контролируем", "каждое", "звено", "-"],
  ["от", "цвета", "панциря", "живого", "рака", "в", "аквариуме"],
  ["до", "вашей", "двери."],
] as const;

const BODY_LINES = [
  "Биск варим пять часов.",
  "Камчатский краб прилетает живым с кораблей.",
  "Логисты знают, сколько живёт каждый продукт.",
] as const;

const CLOSING_LINE = "Ингредиенты с дефектом не попадают на кухню.";

// ---------------------------------------------------------------------------
// Continuous river flow (not discrete phases).
//
// Three blocks live in one 200vh-section flow. The flow translates -100vh
// across the scroll, so every block's center passes through viewport center:
//
//     flow y ─────────────────────────────────────────
//            0vh                                  -100vh
//     block  center-at-50vh   center-at-100vh   center-at-150vh
//            (@p=0: b1 focus, b2 edge, b3 clipped)
//            (@p=0.5: all three visible, b2 focus)
//            (@p=1.0: b1 clipped, b2 edge, b3 focus)
//
// Each block independently measures proximity to viewport center in rAF:
//   p = (blockCenterY - vh/2) / (vh/2), clamped to [-1, +1]
//   scale   = 1 - |p| * 0.15   (1.0 center, 0.85 edges)
//   opacity = 1 - |p| * 0.85   (1.0 center, 0.15 edges)
//   blur    = |p| * 6px        (0px center, 6px edges)
//
// Effect: flanking blocks are soft/small/translucent; the one at center is
// in focus. No discrete appear/disappear — continuous flowing text river.
//
// Progress pattern mirrors aquarium-to-table.tsx:119-141 (rAF +
// getBoundingClientRect — NOT useScroll, which desyncs under Lenis in
// Firefox). If a third section ever wants this, extract a hook.
// ---------------------------------------------------------------------------

const POSTER_STACK =
  'var(--font-poster), var(--font-display), "Cormorant Garamond", serif';
const TEXT_PRIMARY_RGB = "242, 232, 213";

const SPRING = { stiffness: 100, damping: 30, mass: 0.5 } as const;

// 50vh between block centers — all three pass through viewport center during
// scroll, and critically the last block has exited the viewport by p=1.
// That matters because the next section (trusted-by) has margin-top: -100vh
// and its sticky pin engages exactly at our p=1 — if block 3 were still
// centered at that moment (as with FLOW_TRANSLATE=100), the two headings
// would "dance" through each other with no opaque surface to occlude them.
//   progress 0.0 : blocks at 50 / 100 / 150  (b1 center)
//   progress 0.33: blocks at  0 /  50 / 100  (b2 center, b1 clipping out)
//   progress 0.67: blocks at -50 /   0 /  50  (b3 center)
//   progress 1.0 : blocks at -100 / -50 / 0  (all above viewport; b3 at top edge)
const SECTION_HEIGHT_VH = 200;
const FLOW_TRANSLATE_VH = 150;
const BLOCK_CENTERS_VH = [50, 100, 150] as const;

const SCALE_FALLOFF = 0.15;
const OPACITY_FALLOFF = 0.85;
const BLUR_MAX_PX = 6;

const HEADING_LINE_PAD = [
  "clamp(40px, 5vw, 80px)",
  "clamp(40px, 5vw, 80px)",
  "clamp(120px, 12vw, 200px)",
  "clamp(240px, 22vw, 400px)",
] as const;

// Body shifts from near-left (was 80-160px) to mid-viewport via paddingLeft.
// Closing shifts further right via even larger paddingLeft. text-align stays
// left on all three; the block is moved by padding, not centered/right-aligned.
const BODY_LINE_PAD = [
  "clamp(280px, 30vw, 560px)",
  "clamp(340px, 36vw, 680px)",
  "clamp(280px, 30vw, 560px)",
] as const;

// Aligned with HEADING_LINE_PAD[2] so the closing italic echoes the
// third heading line's left edge — compositional vertical rhyme.
const CLOSING_LINE_PAD = "clamp(120px, 12vw, 200px)";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const sectionCinematicStyle: CSSProperties = {
  position: "relative",
  // marginTop: -100vh is applied via the .brand-story--overlap-pin class in
  // globals.css — keeping it in CSS lets the menu-open override zero it out
  // (inline style would always win regardless of CSS specificity).
  // Overlap rationale: a top:0 sticky pin of height:100vh leaves 100vh of
  // "pin travels up" scroll after our custom progress hits 1 — during which
  // the viewport is just dark pin bg. Pulling this section up by -100vh
  // means our own sticky container engages exactly as the upstream pin
  // unsticks, eliminating the empty-dark gap.
  height: `${SECTION_HEIGHT_VH}vh`,
  // No explicit bg — body dark shows through before sticky engages (so this
  // section's dark surface doesn't clip the bottom of the cream-pause pin
  // during the overlap zone). Once sticky engages, aquarium pin is dark too
  // (bg: color-bg-dark) so the handoff reads as one continuous surface.
};

const sectionStackedStyle: CSSProperties = {
  position: "relative",
  marginTop: "clamp(120px, 18vh, 240px)",
  marginBottom: "clamp(80px, 12vh, 160px)",
  paddingInline: "clamp(24px, 5vw, 48px)",
  textAlign: "center",
  background: "var(--color-bg-dark)",
};

const stickyContainerStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  height: "100vh",
  minHeight: "720px",
  overflow: "hidden",
};

const flowContainerStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: `${SECTION_HEIGHT_VH}vh`,
  willChange: "transform",
};

const blockBaseCss = (topVh: number): CSSProperties => ({
  position: "absolute",
  top: `${topVh}vh`,
  left: 0,
  right: 0,
  margin: 0,
  transformOrigin: "center center",
  willChange: "transform, opacity, filter",
});

const headingStyle: CSSProperties = {
  fontFamily: POSTER_STACK,
  fontStyle: "italic",
  fontWeight: 400,
  fontSize: "clamp(40px, 5vw, 72px)",
  lineHeight: 1.2,
  color: "var(--text-primary)",
  textAlign: "left",
};

const bodyWrapStyle: CSSProperties = {
  fontFamily: POSTER_STACK,
  fontStyle: "normal",
  fontWeight: 400,
  fontSize: "clamp(40px, 5vw, 72px)",
  lineHeight: 1.2,
  color: `rgba(${TEXT_PRIMARY_RGB}, 0.85)`,
  textAlign: "left",
};

const closingStyle: CSSProperties = {
  fontFamily: POSTER_STACK,
  fontStyle: "italic",
  fontWeight: 400,
  fontSize: "clamp(40px, 5vw, 72px)",
  lineHeight: 1.2,
  color: `rgba(${TEXT_PRIMARY_RGB}, 0.7)`,
  textAlign: "left",
};

const lineBlockStyle: CSSProperties = { display: "block", margin: 0 };

// ---------------------------------------------------------------------------
// Stacked fallback — mobile / reduced-motion / short viewport.
// ---------------------------------------------------------------------------

function StackedFallback({ prefersReduced }: { prefersReduced: boolean }) {
  const baseInitial = prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 };
  const baseAnimate = { opacity: 1, y: 0 };
  const viewport = { once: true, margin: "-10% 0px" };
  const duration = prefersReduced ? 0 : 0.6;

  const centeredHeading: CSSProperties = {
    ...headingStyle,
    textAlign: "center",
    maxWidth: "22ch",
    marginInline: "auto",
  };
  const centeredBody: CSSProperties = {
    ...bodyWrapStyle,
    textAlign: "center",
    maxWidth: "52ch",
    marginInline: "auto",
    marginTop: "clamp(32px, 5vh, 64px)",
  };
  const centeredClosing: CSSProperties = {
    ...closingStyle,
    textAlign: "center",
    maxWidth: "52ch",
    marginInline: "auto",
    marginTop: "clamp(28px, 4vh, 56px)",
  };

  return (
    <section id="brand-story" style={sectionStackedStyle}>
      <motion.h2
        style={centeredHeading}
        initial={baseInitial}
        whileInView={baseAnimate}
        viewport={viewport}
        transition={{ duration }}
      >
        {HEADING_LINES.map((line, i) => (
          <span key={i} style={lineBlockStyle}>
            {line.join("\u00A0")}
          </span>
        ))}
      </motion.h2>

      <motion.div
        style={centeredBody}
        initial={baseInitial}
        whileInView={baseAnimate}
        viewport={viewport}
        transition={{ duration, delay: prefersReduced ? 0 : 0.1 }}
      >
        {BODY_LINES.map((line, i) => (
          <p key={i} style={{ margin: 0, marginTop: i === 0 ? 0 : "0.45em" }}>
            {line}
          </p>
        ))}
      </motion.div>

      <motion.p
        style={centeredClosing}
        initial={baseInitial}
        whileInView={baseAnimate}
        viewport={viewport}
        transition={{ duration, delay: prefersReduced ? 0 : 0.2 }}
      >
        {CLOSING_LINE}
      </motion.p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Cinematic — continuous proximity-driven flow.
// ---------------------------------------------------------------------------

const proxToScale = (p: number) => 1 - Math.abs(p) * SCALE_FALLOFF;
const proxToOpacity = (p: number) => 1 - Math.abs(p) * OPACITY_FALLOFF;
const proxToFilter = (p: number) => `blur(${(Math.abs(p) * BLUR_MAX_PX).toFixed(2)}px)`;

function useProximityMotion(prox: MotionValue<number>) {
  const scale = useTransform(prox, proxToScale);
  const opacity = useTransform(prox, proxToOpacity);
  const filter = useTransform(prox, proxToFilter);
  return { scale, opacity, filter };
}

function Cinematic() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const closingRef = useRef<HTMLParagraphElement | null>(null);

  const scrollYProgress = useMotionValue(0);
  const headingProx = useMotionValue(1);
  const bodyProx = useMotionValue(1);
  const closingProx = useMotionValue(1);

  useEffect(() => {
    let raf = 0;

    const measureProx = (
      ref: MutableRefObject<HTMLElement | null>,
      mv: MotionValue<number>,
      vh: number,
    ) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const blockCenter = r.top + r.height / 2;
      const vhCenter = vh / 2;
      const p = Math.max(-1, Math.min(1, (blockCenter - vhCenter) / vhCenter));
      mv.set(p);
    };

    const measure = () => {
      const section = sectionRef.current;
      const vh = window.innerHeight;

      if (section) {
        const rect = section.getBoundingClientRect();
        const total = Math.max(1, rect.height - vh);
        const scrolled = -rect.top;
        const p = Math.max(0, Math.min(1, scrolled / total));
        scrollYProgress.set(p);
      }

      measureProx(headingRef as MutableRefObject<HTMLElement | null>, headingProx, vh);
      measureProx(bodyRef as MutableRefObject<HTMLElement | null>, bodyProx, vh);
      measureProx(closingRef as MutableRefObject<HTMLElement | null>, closingProx, vh);

      raf = window.requestAnimationFrame(measure);
    };

    raf = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(raf);
  }, [scrollYProgress, headingProx, bodyProx, closingProx]);

  const smoothProgress = useSpring(scrollYProgress, SPRING);
  const flowY = useTransform(smoothProgress, (p) =>
    typeof window === "undefined" ? 0 : -(FLOW_TRANSLATE_VH / 100) * window.innerHeight * p,
  );

  const heading = useProximityMotion(headingProx);
  const body = useProximityMotion(bodyProx);
  const closing = useProximityMotion(closingProx);

  return (
    <section
      ref={sectionRef}
      id="brand-story"
      className="brand-story--overlap-pin"
      style={sectionCinematicStyle}
    >
      <div style={stickyContainerStyle}>
        <motion.div style={{ ...flowContainerStyle, y: flowY }}>
          <motion.h2
            ref={headingRef}
            style={{
              ...blockBaseCss(BLOCK_CENTERS_VH[0]),
              ...headingStyle,
              y: "-50%",
              scale: heading.scale,
              opacity: heading.opacity,
              filter: heading.filter,
            }}
          >
            {HEADING_LINES.map((line, i) => (
              <span
                key={i}
                style={{ ...lineBlockStyle, paddingLeft: HEADING_LINE_PAD[i] }}
              >
                {line.join("\u00A0")}
              </span>
            ))}
          </motion.h2>

          <motion.div
            ref={bodyRef}
            style={{
              ...blockBaseCss(BLOCK_CENTERS_VH[1]),
              ...bodyWrapStyle,
              y: "-50%",
              scale: body.scale,
              opacity: body.opacity,
              filter: body.filter,
            }}
          >
            {BODY_LINES.map((line, i) => (
              <p
                key={i}
                style={{
                  margin: 0,
                  paddingLeft: BODY_LINE_PAD[i],
                  marginTop: i === 0 ? 0 : "0.3em",
                }}
              >
                {line}
              </p>
            ))}
          </motion.div>

          <motion.p
            ref={closingRef}
            style={{
              ...blockBaseCss(BLOCK_CENTERS_VH[2]),
              ...closingStyle,
              paddingLeft: CLOSING_LINE_PAD,
              // Cap line length so the closing italic wraps naturally to
              // two balanced lines — matching the prior composition where
              // the old padding-pushed-right layout forced wrap via
              // remaining viewport width.
              maxWidth: "24ch",
              y: "-50%",
              scale: closing.scale,
              opacity: closing.opacity,
              filter: closing.filter,
            }}
          >
            {CLOSING_LINE}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Mount switch — SSR default stacks (null isDesktop). After hydration,
// matchMedia decides cinematic vs stacked. Gate on width AND height so
// short-viewport desktops (<720px) fall back to stacked.
// ---------------------------------------------------------------------------

export function BrandStory() {
  const prefersReduced = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1024px) and (min-height: 720px)");
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const useStacked = Boolean(prefersReduced) || isDesktop === null || !isDesktop;

  if (useStacked) {
    return <StackedFallback prefersReduced={Boolean(prefersReduced)} />;
  }

  return <Cinematic />;
}

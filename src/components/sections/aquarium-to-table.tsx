"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useMatchMedia } from "@/hooks/use-match-media";
import { useSectionProgress } from "@/hooks/use-section-progress";

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
  const creamLayerRef = useRef<HTMLDivElement | null>(null);
  const photoAliveRef = useRef<HTMLDivElement | null>(null);
  const photoServedRef = useRef<HTMLDivElement | null>(null);
  const maskPathRef = useRef<SVGPathElement | null>(null);
  const prefersReduced = useReducedMotion();
  const isMobile = useMatchMedia("(max-width: 767px)");
  // Mouse parallax only on widescreen + pointer-fine devices.
  const isParallaxCapable = useMatchMedia(
    "(min-width: 1024px) and (pointer: fine)",
  );
  const [photo1Active, setPhoto1Active] = useState(false);
  const [textActive, setTextActive] = useState(false);
  const [photo2Active, setPhoto2Active] = useState(false);

  const useFallback = Boolean(prefersReduced) || isMobile;

  const scrollYProgress = useSectionProgress(sectionRef, "through", { menuOpenGuard: true });

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
  // Cream back-plate opacity — stays solid cream behind the flipping hero
  // (so flip-in reveals cream, not the pin's dark baseline) and fades to 0
  // while cream-layer is still fully opaque (0.6 → 0.8), so by the time the
  // exit flip starts at 0.92 the pin bg is already dark and transitions
  // seamlessly into BrandStory below.
  const creamBgOpacity = useTransform(smooth, [0.6, 0.8], [1, 0]);

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
    // Sequenced reveals — once latched, never unlatch (forward-only progression).
    // Line starts drawing as photo1 appears and finishes as photo2 appears.
    if (!photo1Active && v >= 0.3) setPhoto1Active(true);
    if (!textActive && v >= 0.4) setTextActive(true);
    if (!photo2Active && v >= 0.6) setPhoto2Active(true);
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
    if (prefersReduced) {
      setPhoto1Active(true);
      setTextActive(true);
      setPhoto2Active(true);
    }
  }, [prefersReduced]);

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined" && document.body.dataset.surface === "cream") {
        delete document.body.dataset.surface;
      }
    };
  }, []);

  // Path d is rebuilt from real photo/cream-layer rects so the wave always
  // anchors at photo1 right-bottom and photo2 left-top regardless of viewport
  // aspect ratio. Coords normalized to viewBox 0-100 against cream-layer.
  // Curve is built via Catmull-Rom → Cubic Bezier conversion through waypoints,
  // which guarantees C1 continuity (matching tangents) at every waypoint —
  // no zigzag corners between segments.
  const [pathD, setPathD] = useState<string>("M 0 0");
  const [pathLength, setPathLength] = useState<number>(2000);

  useEffect(() => {
    const compute = () => {
      const layer = creamLayerRef.current;
      const p1 = photoAliveRef.current;
      const p2 = photoServedRef.current;
      if (!layer || !p1 || !p2) return;

      const lr = layer.getBoundingClientRect();
      if (lr.width <= 0 || lr.height <= 0) return;

      const r1 = p1.getBoundingClientRect();
      const r2 = p2.getBoundingClientRect();

      const toX = (px: number) => ((px - lr.left) / lr.width) * 100;
      const toY = (py: number) => ((py - lr.top) / lr.height) * 100;

      const sx = toX(r1.right);
      const sy = toY(r1.bottom);
      const ex = toX(r2.left);
      const ey = toY(r2.top);
      const dx = ex - sx;

      // Two-peak wave above the heading (heading sits at Y ~38-62).
      const peak = 7;
      const valley = 21;

      const wps: Array<[number, number]> = [
        [sx, sy],
        [sx + dx * 0.2, valley],
        [sx + dx * 0.42, peak],
        [sx + dx * 0.62, valley],
        [sx + dx * 0.82, peak],
        [ex, ey],
      ];

      const tension = 0.22;
      const f = (n: number) => n.toFixed(2);

      let d = `M ${f(wps[0][0])} ${f(wps[0][1])}`;
      for (let i = 0; i < wps.length - 1; i++) {
        const p0 = wps[Math.max(0, i - 1)];
        const p1pt = wps[i];
        const p2pt = wps[i + 1];
        const p3 = wps[Math.min(wps.length - 1, i + 2)];

        const c1x = p1pt[0] + (p2pt[0] - p0[0]) * tension;
        const c1y = p1pt[1] + (p2pt[1] - p0[1]) * tension;
        const c2x = p2pt[0] - (p3[0] - p1pt[0]) * tension;
        const c2y = p2pt[1] - (p3[1] - p1pt[1]) * tension;

        d += ` C ${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2pt[0])} ${f(p2pt[1])}`;
      }

      setPathD(d);
    };

    compute();
    const ro = new ResizeObserver(compute);
    if (creamLayerRef.current) ro.observe(creamLayerRef.current);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  useEffect(() => {
    const path = maskPathRef.current;
    if (!path) return;
    const id = requestAnimationFrame(() => {
      const len = path.getTotalLength();
      if (len > 0) setPathLength(len);
    });
    return () => cancelAnimationFrame(id);
  }, [pathD]);

  // Wipe via stroked mask path — the mask's dash grows along the path direction,
  // so dots reveal sequentially along the curve (not horizontally).
  // Synced with reveal triggers: starts as photo1 lands (0.32), ends as photo2 lands (0.60).
  const wipeProgress = useTransform(smooth, [0.32, 0.6], [0, 1]);

  // Mouse-driven parallax — photo frames drift gently opposite to the cursor
  // (max ±5px) on widescreen pointer-fine devices. Spring-smoothed so the
  // motion reads as atmospheric rather than tracking 1:1 with the cursor.
  // Disabled on reduced motion, narrow viewports, or coarse pointers.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 80, damping: 40, mass: 0.5 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 40, mass: 0.5 });
  const parallaxX = useTransform(springX, (v) => -v * 5);
  const parallaxY = useTransform(springY, (v) => -v * 5);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || !isParallaxCapable || prefersReduced) return;
    let raf = 0;
    let lastE: MouseEvent | null = null;
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    const onResize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
    };
    const tick = () => {
      raf = 0;
      if (!lastE) return;
      mouseX.set((lastE.clientX / vw) * 2 - 1);
      mouseY.set((lastE.clientY / vh) * 2 - 1);
    };
    const onMove = (e: MouseEvent) => {
      lastE = e;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    let attached = false;
    const attach = () => {
      if (attached) return;
      attached = true;
      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("resize", onResize);
    };
    const detach = () => {
      if (!attached) return;
      attached = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? attach() : detach()),
      { rootMargin: "200px" },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      detach();
    };
  }, [isParallaxCapable, prefersReduced, mouseX, mouseY]);
  // Drive stroke-dashoffset directly via setAttribute. Going through framer's
  // motion.path style was unreliable on SVG (style.strokeDashoffset doesn't
  // propagate to the SVG attribute the same way it does for HTML elements).
  useEffect(() => {
    const path = maskPathRef.current;
    if (!path) return;
    if (prefersReduced) {
      path.setAttribute("stroke-dashoffset", "0");
      return;
    }
    const apply = (v: number) => {
      path.setAttribute("stroke-dashoffset", String(pathLength * (1 - v)));
    };
    apply(wipeProgress.get());
    return wipeProgress.on("change", apply);
  }, [wipeProgress, pathLength, prefersReduced, pathD]);

  const photoInitial = prefersReduced
    ? { opacity: 1, scale: 1 }
    : { opacity: 0, scale: 0.92 };
  const photoAnimate = { opacity: 1, scale: 1 };

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
      };

  return (
    <section
      ref={sectionRef}
      className="aquarium-to-table"
      style={{ position: "relative" }}
    >
      <div className="aquarium-to-table__pin">
        <motion.div
          className="aquarium-to-table__cream-bg"
          aria-hidden
          style={{ opacity: creamBgOpacity }}
        />
        <motion.div
          className="aquarium-to-table__hero-layer"
          style={heroStyle}
        >
          {children}
        </motion.div>

        <motion.div
          ref={creamLayerRef}
          className="aquarium-to-table__cream-layer"
          style={creamStyle}
        >
          <motion.div
            ref={photoAliveRef}
            className="aquarium-to-table__photo aquarium-to-table__photo--alive"
            initial={photoInitial}
            animate={photo1Active ? photoAnimate : photoInitial}
            transition={{
              duration: prefersReduced ? 0 : 0.9,
              ease: EXPO_OUT,
            }}
            style={{ x: parallaxX, y: parallaxY }}
          >
            <Image
              src="/images/aquarium/crayfish-alive.png"
              alt="Живой рак в аквариуме"
              fill
              sizes="(max-width: 767px) 60vw, 14vw"
              style={{ objectFit: "cover" }}
            />
          </motion.div>

          <div className="aquarium-to-table__inner" style={creamInnerStyle}>
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

          <motion.div
            ref={photoServedRef}
            className="aquarium-to-table__photo aquarium-to-table__photo--served"
            initial={photoInitial}
            animate={photo2Active ? photoAnimate : photoInitial}
            transition={{
              duration: prefersReduced ? 0 : 0.9,
              ease: EXPO_OUT,
            }}
            style={{ x: parallaxX, y: parallaxY }}
          >
            <Image
              src="/images/aquarium/crayfish-served.png"
              alt="Готовая подача раков на тарелке"
              fill
              sizes="(max-width: 767px) 60vw, 14vw"
              style={{ objectFit: "cover" }}
            />
          </motion.div>

          <svg
            className="aquarium-to-table__line"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <mask
                id="aquarium-line-reveal"
                maskUnits="userSpaceOnUse"
                maskContentUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="100"
                height="100"
              >
                <rect x="0" y="0" width="100" height="100" fill="black" />
                <path
                  ref={maskPathRef}
                  d={pathD}
                  stroke="white"
                  strokeWidth={3}
                  strokeDasharray={pathLength}
                  strokeDashoffset={pathLength}
                  strokeLinecap="butt"
                  fill="none"
                />
              </mask>
            </defs>
            <path
              d={pathD}
              stroke="rgba(16, 28, 30, 0.55)"
              strokeWidth={4}
              strokeDasharray="0 14"
              strokeLinecap="round"
              fill="none"
              vectorEffect="non-scaling-stroke"
              mask="url(#aquarium-line-reveal)"
            />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}

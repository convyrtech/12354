"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useMatchMedia } from "@/hooks/use-match-media";
import { useSectionProgress } from "@/hooks/use-section-progress";

type Partner = {
  name: string;
  src: string;
  /** Full-color logo — skip the invert/grayscale chain, keep brand colors. */
  isColor?: boolean;
};

const PARTNERS: readonly Partner[] = [
  { name: "Пушкинъ", src: "/images/partners/pushkin-real.png" },
  { name: "Maison Dellos", src: "/images/partners/maison-dellos-real.png" },
  { name: "Sanduny 1808", src: "/images/partners/sanduny-1808-real.png" },
  {
    name: "Шале на Рублёвке",
    src: "/images/partners/chalet-na-rublyovke-real.png",
    isColor: true,
  },
  { name: "Soho Family", src: "/images/partners/soho-family-real.png" },
  { name: "Артилэнд", src: "/images/partners/artilend-real.png" },
];

const FILTER_MONO = [
  "invert(1) brightness(1.1) grayscale(0.5) blur(8px)",
  "invert(1) brightness(1.25) grayscale(0.35) blur(2px)",
  "invert(1) brightness(1.5) grayscale(0.2) blur(0px)",
  "invert(1) brightness(1.25) grayscale(0.35) blur(2px)",
  "invert(1) brightness(1.1) grayscale(0.5) blur(8px)",
] as const;

// Color logos preserve brand palette — only blur + gentle brightness ramp
// for coverflow depth. Center gets a tiny contrast boost to pop on dark.
const FILTER_COLOR = [
  "brightness(0.8) blur(8px)",
  "brightness(0.95) blur(2px)",
  "brightness(1.1) contrast(1.05) blur(0px)",
  "brightness(0.95) blur(2px)",
  "brightness(0.8) blur(8px)",
] as const;

const N = PARTNERS.length;

// Section height: phase 1 (heading large center) → phase 2 (heading slides left) →
// phase 3 (coverflow rotates through N-1 transitions). 380vh keeps the per-logo
// dwell at ~50vh of scroll which feels deliberate, not forced.
const SECTION_HEIGHT_VH = 280;
// Slower spring (lower stiffness, higher damping/mass) → buttery transitions
// for the heading move-and-shrink. Same spring drives the coverflow index too.
const SPRING = { stiffness: 70, damping: 35, mass: 0.7 } as const;

// Phase boundaries on the smooth motion value.
// HEAD_HOLD is near-zero — on wide viewports a longer hold reads as an
// awkward empty-dark pause after BrandStory ends.
const HEAD_HOLD = 0.02;
const HEAD_SETTLE = 0.22;
const COVER_FADE_IN = [0.15, 0.25] as const;

export function TrustedBy() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const prefersReduced = useReducedMotion();
  const isMobile = useMatchMedia("(max-width: 767px)");

  const scrollYProgress = useSectionProgress(sectionRef, "through");

  const smooth = useSpring(scrollYProgress, SPRING);

  // Heading: starts visually centered in the viewport, then slides into the
  // left column and shrinks. translateX uses vw so the geometry adapts to
  // viewport width without remounting on resize.
  const headingX = useTransform(
    smooth,
    [0, HEAD_HOLD, HEAD_SETTLE],
    ["30vw", "30vw", "0vw"],
  );
  const headingScale = useTransform(
    smooth,
    [0, HEAD_HOLD, HEAD_SETTLE],
    [1, 1, 0.55],
  );

  // Heading opacity — invisible until our own sticky pin actually engages.
  // The section has margin-top: -100vh (overlaps brand-story's pin-exit zone
  // to kill the 100vh dead gap), so without this fade our pin would already
  // render the heading at its initial position while brand-story's closing
  // line is still in focus upstream — the user reads that as "two headings
  // dancing". p stays clamped at 0 during the whole pre-stuck phase, so
  // fading [0, 0.03] → [0, 1] means the heading only appears once rect.top
  // actually crosses the viewport top and p starts climbing.
  const headingOpacity = useTransform(smooth, [0, 0.03], [0, 1]);

  // Coverflow: faded in just before the heading settles, then center index
  // walks 0 → N-1 across the remaining scroll.
  const coverflowOpacity = useTransform(
    smooth,
    [COVER_FADE_IN[0], COVER_FADE_IN[1]],
    [0, 1],
  );
  const centerIndex = useTransform(smooth, [HEAD_SETTLE, 1], [0, N - 1]);

  // Colon appears right as the heading settles into the left column — small
  // typographic punctuation that hints "here come the partners".
  const colonOpacity = useTransform(smooth, [HEAD_SETTLE, HEAD_SETTLE + 0.05], [0, 1]);

  // Z-depth exit — fires during the final 15% of our scroll (~42vh). Feeds
  // the cross-section camera-push into the cream CTA that follows: this pin
  // recedes (scale↓, blur↑, opacity↓, y↑) while menu-entry.tsx approaches
  // from the opposite direction on its own rAF. Blur capped at 4px because
  // compounding it with the coverflow's existing invert/grayscale filter
  // stack gets expensive at 60fps on mid-range GPUs.
  const pinScale = useTransform(smooth, [0.85, 1.0], [1, 0.85]);
  const pinOpacity = useTransform(smooth, [0.85, 1.0], [1, 0]);
  const pinFilter = useTransform(
    smooth,
    [0.85, 1.0],
    ["blur(0px)", "blur(4px)"],
  );
  const pinY = useTransform(smooth, [0.85, 1.0], [0, -80]);

  const useFallback = Boolean(prefersReduced) || isMobile;

  if (useFallback) {
    return (
      <section className="trusted-by trusted-by--static">
        <div className="trusted-by__static-inner">
          <h2 className="trusted-by__heading trusted-by__heading--static">
            Нам доверяют
          </h2>
          <div className="trusted-by__grid">
            {PARTNERS.map((p) => (
              <div key={p.name} className="trusted-by__grid-item">
                <Image
                  src={p.src}
                  alt={p.name}
                  width={400}
                  height={120}
                  sizes="(max-width: 767px) 40vw, 200px"
                  style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="trusted-by"
      style={{ height: `${SECTION_HEIGHT_VH}vh` }}
    >
      <motion.div
        className="trusted-by__pin"
        style={{
          scale: pinScale,
          opacity: pinOpacity,
          filter: pinFilter,
          y: pinY,
        }}
      >
        <motion.div
          className="trusted-by__heading-wrap"
          style={{ x: headingX, scale: headingScale, opacity: headingOpacity }}
        >
          <h2 className="trusted-by__heading">
            Нам доверяют
            <motion.span
              aria-hidden
              style={{ opacity: colonOpacity, display: "inline-block" }}
            >
              :
            </motion.span>
          </h2>
        </motion.div>

        <motion.div
          className="trusted-by__coverflow"
          style={{ opacity: coverflowOpacity }}
          aria-label="Партнёры"
        >
          {PARTNERS.map((p, i) => (
            <CoverflowSlide
              key={p.name}
              partner={p}
              index={i}
              centerIndex={centerIndex}
            />
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

function CoverflowSlide({
  partner,
  index,
  centerIndex,
}: {
  partner: Partner;
  index: number;
  centerIndex: MotionValue<number>;
}) {
  // t = 0 when this slide is centered. Negative = upcoming (right side),
  // positive = past (left side) — matches the visual direction of motion.
  const t = useTransform(centerIndex, (v) => v - index);

  const x = useTransform(
    t,
    [-3, -1, 0, 1, 3],
    ["560px", "300px", "0px", "-300px", "-560px"],
  );
  const scale = useTransform(t, [-2, -1, 0, 1, 2], [0.55, 0.78, 1, 0.78, 0.55]);
  const opacity = useTransform(
    t,
    [-3, -2, -1, 0, 1, 2, 3],
    [0, 0.25, 0.6, 1, 0.6, 0.25, 0],
  );
  const rotateY = useTransform(t, [-1, 0, 1], [-35, 0, 35]);
  // Filter has to carry invert/brightness/grayscale here too — framer-motion's
  // style.filter replaces the CSS filter wholesale. For mono wordmarks,
  // invert(1) flips dark glyphs to light on dark surface. For isColor logos
  // we keep the brand palette and only ramp brightness + blur for depth.
  const filterValues = partner.isColor ? FILTER_COLOR : FILTER_MONO;
  const filter = useTransform(t, [-2, -1, 0, 1, 2], [...filterValues]);
  const zIndex = useTransform(t, (v) => Math.round(10 - Math.abs(v)));

  return (
    <motion.div
      className="trusted-by__slide"
      style={{ x, scale, opacity, rotateY, filter, zIndex }}
    >
      <Image
        src={partner.src}
        alt={partner.name}
        width={400}
        height={120}
        sizes="(max-width: 1024px) 25vw, 320px"
        style={{
          width: "100%",
          height: "auto",
          objectFit: "contain",
          display: "block",
        }}
      />
    </motion.div>
  );
}

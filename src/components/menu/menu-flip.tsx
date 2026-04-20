"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { useSectionProgress } from "@/hooks/use-section-progress";

const SPRING = { stiffness: 90, damping: 28, mass: 0.6 } as const;

type Props = {
  hero: ReactNode;
};

// MenuFlip plays the dark-hero → cream transition inside a sticky pin, then
// hands off to normal document flow below. Catalog content must live as a
// SIBLING after the flip — putting it inside the pin clips everything past
// the first viewport and breaks scrolling on long /menu pages.
export function MenuFlip({ hero }: Props) {
  const prefersReduced = useReducedMotion() ?? false;

  if (prefersReduced) {
    return <section>{hero}</section>;
  }

  return <MenuFlipAnimated hero={hero} />;
}

function MenuFlipAnimated({ hero }: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const progress = useSectionProgress(sectionRef, "through");
  const smooth = useSpring(progress, SPRING);

  // Container is 180vh = 100vh pin + 80vh of scroll animation. Pin sticky
  // until the cream fully rises, then releases. Catalog uses
  // .menu-catalog--overlap-pin (margin-top: -100vh) so it's already in
  // position when the pin unsticks — no dead scroll-through of empty pin.
  const heroRotateX = useTransform(smooth, [0, 0.9], [0, -95]);
  const heroOpacity = useTransform(smooth, [0, 0.8, 0.92], [1, 1, 0]);
  const heroY = useTransform(smooth, [0, 0.9], ["0%", "-6%"]);
  const creamY = useTransform(smooth, [0, 0.9], ["100%", "0%"]);

  return (
    <section ref={sectionRef} className="menu-flip">
      <div className="menu-flip__pin">
        <motion.div
          className="menu-flip__hero-layer"
          style={{ rotateX: heroRotateX, opacity: heroOpacity, y: heroY }}
        >
          {hero}
        </motion.div>
        <motion.div
          className="menu-flip__cream-layer"
          style={{ y: creamY }}
          aria-hidden
        />
      </div>
    </section>
  );
}

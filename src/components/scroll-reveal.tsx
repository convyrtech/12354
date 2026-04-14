"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const revealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
    },
  },
};

type ScrollRevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article";
};

export function ScrollReveal({
  children,
  delay = 0,
  className,
  as = "div",
}: ScrollRevealProps) {
  const Component = motion.create(as);

  return (
    <Component
      variants={revealVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className={className}
    >
      {children}
    </Component>
  );
}

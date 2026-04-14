"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

export function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springX = useSpring(cursorX, { damping: 25, stiffness: 400 });
  const springY = useSpring(cursorY, { damping: 25, stiffness: 400 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on desktop (no touch)
    if (window.matchMedia("(pointer: fine)").matches) {
      setVisible(true);
    }

    const handleMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [cursorX, cursorY]);

  if (!visible) return null;

  return (
    <motion.div
      className="pointer-events-none fixed z-[9998]"
      style={{
        x: springX,
        y: springY,
        width: 16,
        height: 16,
        borderRadius: "50%",
        backgroundColor: "var(--accent)",
        opacity: 0.7,
        transform: "translate(-50%, -50%)",
        mixBlendMode: "screen",
      }}
    />
  );
}

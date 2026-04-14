"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { UnderwaterScene } from "./scene/underwater-scene";

/**
 * Client-only WebGL wrapper for the hero atmospheric scene.
 *
 * Sits absolute-positioned behind hero content inside .hero-stage.
 * Respects prefers-reduced-motion: renders a static CSS fallback
 * via hiding the canvas entirely so the existing gradient mesh wins.
 *
 * Performance notes:
 * - dpr capped at [1, 1.5] to avoid overdraw on 4K displays
 * - camera is orthographic-like (FOV small, distance fixed) for 2D feel
 * - single shader plane as background, no scene graph overhead
 */
export function HeroCanvas() {
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!mounted || reducedMotion) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="hero-canvas"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ width: "100%", height: "100%" }}
      >
        <UnderwaterScene />
      </Canvas>
    </div>
  );
}

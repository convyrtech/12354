"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Bucket = "big" | "mid" | "small";

type BucketConfig = {
  sizeRange: readonly [number, number];
  riseDurationMs: number;
  wobbleAmpRange: readonly [number, number];
  growthRange: readonly [number, number];
};

// Sized for a 640–1520 px crayfish poster: small ones dominate the trail,
// rise slowly with wobble; big ones are rare and climb almost straight.
const SIZE_BUCKETS: Record<Bucket, BucketConfig> = {
  big: {
    sizeRange: [28, 40],
    riseDurationMs: 1500,
    wobbleAmpRange: [0, 6],
    growthRange: [0.2, 0.3],
  },
  mid: {
    sizeRange: [16, 24],
    riseDurationMs: 2200,
    wobbleAmpRange: [10, 18],
    growthRange: [0.2, 0.3],
  },
  small: {
    sizeRange: [8, 14],
    riseDurationMs: 3000,
    wobbleAmpRange: [16, 26],
    growthRange: [0.2, 0.3],
  },
};

type Phase = "phase1" | "phase2" | "phase3";

const PHASE_WEIGHTS: Record<Phase, Record<Bucket, number>> = {
  phase1: { big: 2, mid: 5, small: 8 },
  phase2: { big: 0, mid: 5, small: 8 },
  phase3: { big: 0, mid: 3, small: 6 },
};

type Anchor = { xPct: number; yPct: number };

// Zones: tail (28–38 / 58–70), left claw (40–52 / 76–90),
// right claw (52–64 / 76–90), carapace (45–55 / 50–60),
// leg joints sprinkled (38–62 / 70–82).
const SPAWN_ANCHORS: readonly Anchor[] = [
  { xPct: 30, yPct: 62 },
  { xPct: 34, yPct: 60 },
  { xPct: 32, yPct: 66 },
  { xPct: 36, yPct: 68 },
  { xPct: 42, yPct: 80 },
  { xPct: 46, yPct: 78 },
  { xPct: 44, yPct: 86 },
  { xPct: 50, yPct: 82 },
  { xPct: 54, yPct: 80 },
  { xPct: 58, yPct: 78 },
  { xPct: 56, yPct: 86 },
  { xPct: 62, yPct: 84 },
  { xPct: 48, yPct: 54 },
  { xPct: 52, yPct: 56 },
  { xPct: 40, yPct: 74 },
  { xPct: 44, yPct: 72 },
  { xPct: 56, yPct: 74 },
  { xPct: 60, yPct: 78 },
];

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number) {
  return Math.floor(randRange(min, max + 1));
}

function pickBucket(weights: Record<Bucket, number>): Bucket {
  const total = weights.big + weights.mid + weights.small;
  const r = Math.random() * total;
  if (r < weights.big) return "big";
  if (r < weights.big + weights.mid) return "mid";
  return "small";
}

function jitterPx(): [number, number] {
  const angle = Math.random() * Math.PI * 2;
  const radius = randRange(8, 15);
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

type BubbleSpec = {
  id: number;
  sizePx: number;
  leftPx: number;
  topPx: number;
  riseDistPx: number;
  riseDurationMs: number;
  wobbleAmpPx: number;
  wobblePhase: 1 | -1;
  growth: number;
  opacityTarget: number;
};

function makeSpec(
  phase: Phase,
  containerW: number,
  containerH: number,
  id: number,
): BubbleSpec {
  const bucket = pickBucket(PHASE_WEIGHTS[phase]);
  const cfg = SIZE_BUCKETS[bucket];
  const sizePx = randRange(cfg.sizeRange[0], cfg.sizeRange[1]);
  const anchor = SPAWN_ANCHORS[randInt(0, SPAWN_ANCHORS.length - 1)];
  const [jx, jy] = jitterPx();
  const centerX = (anchor.xPct / 100) * containerW + jx;
  const centerY = (anchor.yPct / 100) * containerH + jy;
  const leftPx = centerX - sizePx / 2;
  const topPx = centerY - sizePx / 2;
  return {
    id,
    sizePx,
    leftPx,
    topPx,
    riseDistPx: topPx + sizePx,
    riseDurationMs: cfg.riseDurationMs,
    wobbleAmpPx: randRange(cfg.wobbleAmpRange[0], cfg.wobbleAmpRange[1]),
    wobblePhase: Math.random() < 0.5 ? 1 : -1,
    growth: randRange(cfg.growthRange[0], cfg.growthRange[1]),
    opacityTarget: randRange(0.6, 0.85),
  };
}

function Bubble({
  spec,
  onDone,
}: {
  spec: BubbleSpec;
  onDone: (id: number) => void;
}) {
  const duration = spec.riseDurationMs / 1000;
  const a = spec.wobbleAmpPx;
  const p = spec.wobblePhase;
  const rise = spec.riseDistPx;

  return (
    <motion.span
      className="hero-bubble"
      style={{
        left: spec.leftPx,
        top: spec.topPx,
        width: spec.sizePx,
        height: spec.sizePx,
      }}
      initial={{ y: 0, x: 0, scale: 1, opacity: 0 }}
      animate={{
        y: [0, -rise * 0.35, -rise],
        x: [0, a * p, -a * 0.7 * p, a * 0.5 * p, -a * 0.3 * p, 0],
        scale: [1, 1 + spec.growth],
        opacity: [0, spec.opacityTarget, spec.opacityTarget, 0],
      }}
      transition={{
        y: { duration, times: [0, 0.55, 1], ease: ["easeOut", "easeIn"] },
        x: { duration, ease: "easeInOut" },
        scale: { duration, ease: "linear" },
        opacity: { duration, times: [0, 0.07, 0.88, 1], ease: "linear" },
      }}
      onAnimationComplete={() => onDone(spec.id)}
    />
  );
}

type HeroBubblesProps = {
  entranceDelay: number;
  entranceDuration: number;
  idleStartDelay: number;
  /** Scales counts and idle frequency. 1 = default back layer; 0.25 = sparse
   *  front layer. Zero disables everything. */
  density?: number;
  /** Extra class appended to the container — lets the front layer opt-in to
   *  slightly elevated readability (see globals.css). */
  variant?: "back" | "front";
};

export function HeroBubbles({
  entranceDelay,
  entranceDuration,
  idleStartDelay,
  density = 1,
  variant = "back",
}: HeroBubblesProps) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const idCounterRef = useRef(0);
  const [bubbles, setBubbles] = useState<BubbleSpec[]>([]);

  const removeBubble = useCallback((id: number) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
  }, []);

  useEffect(() => {
    if (prefersReduced || density <= 0) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    const pendingTimeouts: number[] = [];
    let idleTimeout: number | null = null;
    let cancelled = false;

    const spawn = (phase: Phase) => {
      if (cancelled) return;
      idCounterRef.current += 1;
      const spec = makeSpec(phase, w, h, idCounterRef.current);
      setBubbles((prev) => [...prev, spec]);
    };

    // Phase 1 — cascade across the whole fall so bubbles trail the crayfish
    // from first motion to landing.
    const phase1StartMs = entranceDelay * 1000;
    const phase1WindowMs = entranceDuration * 1000;
    const phase1Count = Math.max(1, Math.round(randInt(25, 35) * density));
    const phase1Jitter = phase1WindowMs / phase1Count;
    for (let i = 0; i < phase1Count; i++) {
      const base = phase1StartMs + (i / phase1Count) * phase1WindowMs;
      const jitter = randRange(-phase1Jitter / 2, phase1Jitter / 2);
      const t = window.setTimeout(
        () => spawn("phase1"),
        Math.max(0, base + jitter),
      );
      pendingTimeouts.push(t);
    }

    // Phase 2 — tail-off after landing, no big bubbles.
    const phase2StartMs = phase1StartMs + phase1WindowMs;
    const phase2WindowMs = 700;
    const phase2Count = Math.max(1, Math.round(randInt(5, 10) * density));
    for (let i = 0; i < phase2Count; i++) {
      const base = phase2StartMs + (i / phase2Count) * phase2WindowMs;
      const jitter = randRange(-40, 40);
      const t = window.setTimeout(
        () => spawn("phase2"),
        Math.max(0, base + jitter),
      );
      pendingTimeouts.push(t);
    }

    // Phase 3 — self-rescheduling idle heartbeat. Lower density → longer gaps.
    const scheduleNextIdle = () => {
      if (cancelled) return;
      const delay = (1200 + Math.random() * 1800) / density;
      idleTimeout = window.setTimeout(() => {
        spawn("phase3");
        scheduleNextIdle();
      }, delay);
    };

    const phase3StartT = window.setTimeout(
      scheduleNextIdle,
      Math.max(0, idleStartDelay * 1000),
    );
    pendingTimeouts.push(phase3StartT);

    return () => {
      cancelled = true;
      for (const t of pendingTimeouts) window.clearTimeout(t);
      if (idleTimeout !== null) window.clearTimeout(idleTimeout);
    };
  }, [prefersReduced, density, entranceDelay, entranceDuration, idleStartDelay]);

  return (
    <div
      ref={containerRef}
      className={`hero-bubbles hero-bubbles--${variant}`}
      aria-hidden
    >
      {bubbles.map((b) => (
        <Bubble key={b.id} spec={b} onDone={removeBubble} />
      ))}
    </div>
  );
}

export default HeroBubbles;

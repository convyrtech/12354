"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { HERO_SCENE } from "@/lib/homepage-data";

// WebGL scene is client-only — SSR skipped to keep first paint fast
// and to avoid three.js trying to acquire a WebGL context on the server.
const HeroCanvas = dynamic(
  () => import("@/components/hero/hero-canvas").then((m) => m.HeroCanvas),
  { ssr: false },
);

/**
 * Wave-emerge filter definitions — one per title line.
 *
 * Each filter is a one-shot SMIL animation: feDisplacementMap.scale
 * starts at a large value (chaotic letters), then decays to 0 (clean
 * text), driven by inline <animate fill="freeze"/>.
 *
 * The keyTimes are front-loaded for ease-out feel: the chaos drops
 * fast, then the last pixels of distortion take longer to settle.
 *
 * Filter region is expanded (-40% / 180%) so displaced pixels at the
 * peak scale (~95) don't clip against the text bounding box.
 *
 * Strapline filter uses smaller scale and slightly different turbulence
 * seed so each line settles with its own "ripple".
 */
const waveFilters: Array<{
  id: string;
  begin: string;
  maxScale: number;
  seed: number;
  duration: string;
}> = [
  { id: "hero-wave-1", begin: "0.15s", maxScale: 92, seed: 6, duration: "1.9s" },
  { id: "hero-wave-2", begin: "0.85s", maxScale: 92, seed: 11, duration: "1.9s" },
  { id: "hero-wave-3", begin: "1.55s", maxScale: 55, seed: 3, duration: "1.55s" },
];

function WaveEmergeDefs() {
  return (
    <svg
      aria-hidden
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {waveFilters.map((f) => (
          <filter
            key={f.id}
            id={f.id}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.018 0.028"
              numOctaves={3}
              seed={f.seed}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={f.maxScale}
              xChannelSelector="R"
              yChannelSelector="G"
            >
              <animate
                attributeName="scale"
                // Front-loaded ease-out: chaos settles fast, last pixels linger
                values={`${f.maxScale};${Math.round(f.maxScale * 0.72)};${Math.round(f.maxScale * 0.48)};${Math.round(f.maxScale * 0.28)};${Math.round(f.maxScale * 0.14)};${Math.round(f.maxScale * 0.06)};${Math.round(f.maxScale * 0.02)};0`}
                keyTimes="0; 0.12; 0.24; 0.38; 0.54; 0.72; 0.88; 1"
                dur={f.duration}
                begin={f.begin}
                fill="freeze"
                repeatCount="1"
              />
            </feDisplacementMap>
          </filter>
        ))}
      </defs>
    </svg>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      className="hero-stage"
      style={{
        position: "relative",
        overflow: "clip",
        padding: "clamp(132px, 14vw, 168px) 0 clamp(84px, 10vw, 132px)",
      }}
    >
      <HeroCanvas />
      <WaveEmergeDefs />

      <div className="home-shell" style={{ position: "relative", zIndex: 1 }}>
        <div className="hero-layout">
          <div className="hero-copy">
            <span className="text-eyebrow hero-reveal" style={{ animationDelay: "80ms" }}>
              {HERO_SCENE.eyebrow}
            </span>

            <h1 className="text-mega hero-title">
              <span className="hero-line">
                <span
                  className="hero-wave-line"
                  style={{
                    filter: "url(#hero-wave-1)",
                    animation: "hero-wave-emerge 1.9s ease-out 0.15s both",
                  }}
                >
                  {HERO_SCENE.titleLead}
                </span>
              </span>
              <span className="hero-line">
                <em
                  className="hero-wave-line hero-title__italic"
                  style={{
                    filter: "url(#hero-wave-2)",
                    animation: "hero-wave-emerge 1.9s ease-out 0.85s both",
                  }}
                >
                  {HERO_SCENE.titleItalic}
                </em>
              </span>
            </h1>

            <p
              className="hero-strapline hero-wave-line"
              style={{
                filter: "url(#hero-wave-3)",
                animation: "hero-wave-emerge 1.55s ease-out 1.55s both",
              }}
            >
              {HERO_SCENE.strapline}
            </p>

            <p
              className="hero-summary hero-reveal"
              style={{ animationDelay: "2400ms" }}
            >
              {HERO_SCENE.summary}
            </p>

            <div className="hero-actions hero-reveal" style={{ animationDelay: "2700ms" }}>
              <Link href="/menu?fulfillment=delivery" className="cta cta--primary">
                Открыть меню
              </Link>
            </div>
          </div>

          <div className="hero-visual hero-visual--reveal">
            <div className="hero-image-wrap">
              <Image
                src={HERO_SCENE.image}
                alt="Свежие раки и крабы на столе — The Raki private service"
                fill
                priority
                sizes="(max-width: 1279px) 100vw, 56vw"
                style={{
                  objectFit: "cover",
                  objectPosition: "56% 54%",
                }}
              />
              <div className="hero-image-tint" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

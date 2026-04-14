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

      {/*
        SVG filter def for hero-title wave distortion.
        Zero-size absolute container so it doesn't affect layout.
        feTurbulence generates animated noise, feDisplacementMap warps
        the source graphic (the h1) based on that noise.
        scale controls distortion strength — tuned so text stays readable.
      */}
      <svg
        aria-hidden
        focusable="false"
        width="0"
        height="0"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      >
        <defs>
          <filter
            id="hero-wave"
            x="-8%"
            y="-8%"
            width="116%"
            height="116%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.009 0.018"
              numOctaves={2}
              seed={4}
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur="18s"
                values="0.009 0.018; 0.012 0.022; 0.008 0.016; 0.011 0.020; 0.009 0.018"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="7"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div className="home-shell" style={{ position: "relative", zIndex: 1 }}>
        <div className="hero-layout">
          <div className="hero-copy">
            <span className="text-eyebrow hero-reveal" style={{ animationDelay: "80ms" }}>
              {HERO_SCENE.eyebrow}
            </span>

            <h1 className="text-mega hero-title hero-title--wave">
              <span className="hero-line">
                <span className="hero-reveal" style={{ animationDelay: "160ms" }}>
                  {HERO_SCENE.titleLead}
                </span>
              </span>
              <span className="hero-line">
                <em className="hero-reveal hero-title__italic" style={{ animationDelay: "260ms" }}>
                  {HERO_SCENE.titleItalic}
                </em>
              </span>
            </h1>

            <p
              className="hero-strapline hero-reveal"
              style={{ animationDelay: "400ms" }}
            >
              {HERO_SCENE.strapline}
            </p>

            <p className="hero-summary hero-reveal" style={{ animationDelay: "520ms" }}>
              {HERO_SCENE.summary}
            </p>

            <div className="hero-actions hero-reveal" style={{ animationDelay: "580ms" }}>
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

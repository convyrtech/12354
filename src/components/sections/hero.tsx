"use client";

import Image from "next/image";
import Link from "next/link";
import { HERO_SCENE } from "@/lib/homepage-data";

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
      <div className="home-shell">
        <div className="hero-layout">
          <div className="hero-copy">
            <span className="text-eyebrow hero-reveal" style={{ animationDelay: "80ms" }}>
              {HERO_SCENE.eyebrow}
            </span>

            <h1 className="text-mega hero-title">
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

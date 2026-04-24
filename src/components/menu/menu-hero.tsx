"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { useFakeAuth } from "@/hooks/use-fake-auth";
import { EditorialLabel } from "@/components/menu/shared/editorial-label";
import { WaiterBlock } from "@/components/menu/waiter-block";

// Word-by-word reveal mirrors hero.tsx (blur 14→0, y 36→0, quart-out
// stagger). Only the greeting uses the staggered reveal; the waiter
// block handles its own fade-in once the response settles.
const QUART_OUT = [0.25, 1, 0.5, 1] as const;
const WORD_STAGGER = 0.14;
const WORD_DURATION = 1.0;
const WORD_BLUR_START = 14;

function formatEyebrowDate(now: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  }).format(now);
}

function formatGreetingName(name: string | null | undefined): string {
  if (!name) return "Добрый вечер.";
  return `Добрый вечер, ${name}.`;
}

export function MenuHero() {
  const { state: auth, hydrated } = useFakeAuth();
  const prefersReduced = useReducedMotion();
  const today = useMemo(() => new Date(), []);

  // Keep the greeting behind the hydrated flag so the word-stagger
  // animation doesn't replay when the name lands after mount.
  const showReturning = hydrated && Boolean(auth.name);
  const greeting = formatGreetingName(showReturning ? auth.name : null);
  const words = useMemo(() => greeting.split(" "), [greeting]);

  const wordInitial = prefersReduced
    ? { opacity: 1, y: 0, filter: "blur(0px)" }
    : { opacity: 0, y: 36, filter: `blur(${WORD_BLUR_START}px)` };
  const wordAnimate = { opacity: 1, y: 0, filter: "blur(0px)" };

  return (
    <section className="menu-hero" aria-label="Меню The Raki">
      <div className="menu-hero__inner">
        <EditorialLabel tone="dark">
          подача на {formatEyebrowDate(today)}
        </EditorialLabel>

        <h1 className="menu-hero__headline" aria-label={greeting}>
          {words.map((word, index) => (
            <motion.span
              key={`${word}-${index}`}
              className="menu-hero__word"
              initial={wordInitial}
              animate={wordAnimate}
              transition={{
                duration: prefersReduced ? 0 : WORD_DURATION,
                delay: prefersReduced ? 0 : 0.1 + index * WORD_STAGGER,
                ease: QUART_OUT,
              }}
              aria-hidden
            >
              {word}
              {index < words.length - 1 ? "\u00A0" : ""}
            </motion.span>
          ))}
        </h1>

        <WaiterBlock />
      </div>
    </section>
  );
}

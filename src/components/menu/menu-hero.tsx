"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo } from "react";
import { useFakeAuth } from "@/hooks/use-fake-auth";
import { EditorialLabel } from "@/components/menu/shared/editorial-label";

// Word-by-word reveal mirrors hero.tsx:17-24 (blur 14→0, y 36→0,
// quart-out stagger 0.18s). Constants kept inline rather than re-exported
// because the two heroes have different word counts and delay anchors.
const QUART_OUT = [0.25, 1, 0.5, 1] as const;
const WORD_STAGGER = 0.14;
const WORD_DURATION = 1.0;
const WORD_BLUR_START = 14;

const REPLY_DELAY = 1.1;
const CHIPS_DELAY = 1.4;
const INPUT_DELAY = 1.7;

type ChipAction =
  | { type: "scroll-to"; anchor: string }
  | { type: "scroll-to-triptych" }
  | { type: "repeat-last" }
  | { type: "focus-waiter" };

type Chip = {
  label: string;
  primary?: boolean;
  action: ChipAction;
};

const GUEST_CHIPS: Chip[] = [
  {
    label: "Что берут чаще всего →",
    primary: true,
    action: { type: "scroll-to-triptych" },
  },
  { label: "Поможете с выбором?", action: { type: "focus-waiter" } },
  { label: "Соберу сам", action: { type: "scroll-to", anchor: "raki" } },
];

const RETURNING_CHIPS: Chip[] = [
  { label: "Повторить последний →", primary: true, action: { type: "repeat-last" } },
  {
    label: "Другие рецепты раков",
    action: { type: "scroll-to", anchor: "raki" },
  },
  { label: "Что-то новенькое", action: { type: "scroll-to-triptych" } },
];

function formatEyebrowDate(now: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(now);
}

function formatGreetingName(name: string | null | undefined): string {
  if (!name) return "Добрый вечер.";
  return `Добрый вечер, ${name}.`;
}

const NAV_OFFSET_PX = 96;

function scrollToAnchor(anchor: string) {
  const el = document.getElementById(anchor);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET_PX - 16;
  window.scrollTo({ top: y, behavior: "smooth" });
}

function isScrollAction(action: ChipAction): boolean {
  return action.type === "scroll-to" || action.type === "scroll-to-triptych";
}

type Props = {
  onChipAction?: (action: ChipAction) => void;
};

export function MenuHero({ onChipAction }: Props) {
  const { state: auth, hydrated } = useFakeAuth();
  const prefersReduced = useReducedMotion();
  const today = useMemo(() => new Date(), []);

  // Until localStorage hydrates we render the guest greeting. Swapping
  // greetings mid-reveal re-keys the word stagger and visibly replays the
  // animation — keep auth-dependent copy behind the hydrated gate.
  const showReturning = hydrated && auth.isAuthenticated;
  const greeting = formatGreetingName(showReturning ? auth.name : null);
  const chips = showReturning ? RETURNING_CHIPS : GUEST_CHIPS;
  const reply = showReturning
    ? "Как обычно — томатные L и цезарь? Или поэкспериментируем сегодня?"
    : "Первый раз у нас. Если хотите — соберём стол. Или гляньте, что берут чаще всего.";

  const words = useMemo(() => greeting.split(" "), [greeting]);

  const handleChipClick = useCallback(
    (action: ChipAction) => {
      // Scroll actions self-resolve in Phase 2 so the hero feels live
      // without depending on Phase 4 waiter wiring. Non-scroll actions
      // (repeat-last, focus-waiter) bubble to the parent if wired,
      // otherwise stay inert — chips without a handler are disabled.
      if (action.type === "scroll-to") {
        scrollToAnchor(action.anchor);
        return;
      }
      if (action.type === "scroll-to-triptych") {
        scrollToAnchor("raki");
        return;
      }
      onChipAction?.(action);
    },
    [onChipAction],
  );

  const wordInitial = prefersReduced
    ? { opacity: 1, y: 0, filter: "blur(0px)" }
    : { opacity: 0, y: 36, filter: `blur(${WORD_BLUR_START}px)` };
  const wordAnimate = { opacity: 1, y: 0, filter: "blur(0px)" };

  return (
    <section className="menu-hero" aria-label="Hero — welcome">
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

        <motion.p
          className="menu-hero__reply"
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReduced ? 0 : 0.6,
            delay: prefersReduced ? 0 : REPLY_DELAY,
            ease: QUART_OUT,
          }}
        >
          <em>{reply}</em>
          <span className="menu-hero__signature">— официант</span>
        </motion.p>

        <motion.div
          className="menu-hero__chips"
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReduced ? 0 : 0.5,
            delay: prefersReduced ? 0 : CHIPS_DELAY,
            ease: QUART_OUT,
          }}
        >
          {chips.map((chip) => {
            const wired = isScrollAction(chip.action) || Boolean(onChipAction);
            return (
              <button
                key={chip.label}
                type="button"
                className="menu-hero__chip"
                data-primary={chip.primary || undefined}
                disabled={!wired}
                onClick={() => handleChipClick(chip.action)}
              >
                {chip.label}
              </button>
            );
          })}
        </motion.div>

        <motion.label
          className="menu-hero__input"
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: prefersReduced ? 0 : 0.5,
            delay: prefersReduced ? 0 : INPUT_DELAY,
          }}
        >
          <span className="menu-hero__input-affordance" aria-hidden>
            ⟶
          </span>
          <span>— спросите официанта</span>
        </motion.label>
      </div>
    </section>
  );
}


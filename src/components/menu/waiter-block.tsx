"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDraft } from "@/components/draft-provider";
import { useCity } from "@/lib/cities/city-context";
import { useFakeAuth } from "@/hooks/use-fake-auth";
import { getMenuItem } from "@/lib/fixtures";
import {
  appendDraftLineItem,
  buildDraftLineItem,
  type DraftModifierSelection,
} from "@/lib/line-item";
import { askWaiter } from "@/lib/waiter/waiter-client";
import { askMock } from "@/lib/waiter/waiter-mock";
import type {
  ChipAction,
  HistoricalOrder,
  WaiterChip,
  WaiterContext,
  WaiterResponse,
} from "@/lib/waiter/waiter-types";
import { WaiterInput } from "@/components/menu/waiter-input";

const NAV_OFFSET_PX = 96;

function scrollToAnchor(anchor: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(anchor);
  if (!el) return;
  const y =
    el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET_PX - 16;
  window.scrollTo({ top: y, behavior: "smooth" });
}

function modifiersToSelections(
  modifiers: Record<string, string> | undefined,
): DraftModifierSelection[] {
  if (!modifiers) return [];
  return Object.entries(modifiers).map(([groupId, optionId]) => ({
    groupId,
    optionIds: [optionId],
  }));
}

function applyRepeatLast(
  order: HistoricalOrder | undefined,
  currentLines: ReturnType<typeof useDraft>["draft"]["lineItems"],
) {
  if (!order) return currentLines;
  let next = currentLines;
  for (const line of order.items) {
    const item = getMenuItem(line.itemId);
    if (!item) continue;
    for (let n = 0; n < Math.max(1, line.qty); n += 1) {
      const built = buildDraftLineItem(
        item,
        modifiersToSelections(line.modifiers),
      );
      next = appendDraftLineItem(next, built);
    }
  }
  return next;
}

export function WaiterBlock() {
  const { state: auth, hydrated } = useFakeAuth();
  const { cityId } = useCity();
  const { draft, patchDraft } = useDraft();
  const prefersReduced = useReducedMotion();

  const context = useMemo<WaiterContext>(
    () => ({
      user: auth.name
        ? {
            name: auth.name,
            phone: auth.phone,
            history: auth.orderHistory,
            paymentPreference: auth.paymentPreference,
            preferredCity: auth.preferredCity,
          }
        : null,
      cart: draft.lineItems,
      cityId,
      now: new Date(),
    }),
    [auth, cityId, draft.lineItems],
  );

  // SSR-safe initial greeting so hero has copy on first paint. After
  // hydration, re-ask the waiter in case auth state brings a different
  // context (e.g. Andrey seeded via ?demo=andrey).
  const initialResponse = useMemo<WaiterResponse>(
    () => askMock(null, { ...context, user: null }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [response, setResponse] = useState<WaiterResponse>(initialResponse);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    setBusy(true);
    askWaiter(null, context)
      .then((next) => {
        if (!cancelled) setResponse(next);
      })
      .catch(() => {
        /* silent */
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-run only when hydration completes or the demo seed flips the user
    // identity. Cart additions shouldn't re-trigger the greeting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, auth.name, cityId]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleChip = useCallback(
    (chip: WaiterChip) => {
      const action: ChipAction = chip.action;
      if (action.type === "scroll-to") {
        scrollToAnchor(action.anchor);
        return;
      }
      if (action.type === "scroll-to-triptych") {
        scrollToAnchor("triptych");
        return;
      }
      if (action.type === "focus-waiter") {
        focusInput();
        return;
      }
      if (action.type === "repeat-last") {
        const lastOrder = auth.orderHistory?.[0];
        if (!lastOrder) return;
        const nextLines = applyRepeatLast(lastOrder, draft.lineItems);
        patchDraft({ lineItems: nextLines, orderStage: "menu" });
        setBusy(true);
        askWaiter("Повторить последний", context)
          .then((next) => setResponse(next))
          .catch(() => {})
          .finally(() => setBusy(false));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("raki:cart-open"));
        }
      }
    },
    [auth.orderHistory, context, draft.lineItems, focusInput, patchDraft],
  );

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setBusy(true);
      try {
        const next = await askWaiter(text, context);
        setResponse(next);
      } finally {
        setBusy(false);
      }
    },
    [context],
  );

  return (
    <>
      <motion.p
        key={response.reply}
        className="menu-hero__reply"
        initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReduced ? 0 : 0.35, ease: "easeOut" }}
      >
        <em>{response.reply}</em>
        <span className="menu-hero__signature">{response.signature}</span>
      </motion.p>

      <div className="menu-hero__chips" role="group" aria-label="Варианты ответа">
        {response.suggestedChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className="menu-hero__chip"
            data-primary={chip.primary || undefined}
            onClick={() => handleChip(chip)}
            disabled={busy}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <WaiterInput ref={inputRef} onSubmit={handleSubmit} busy={busy} />
    </>
  );
}

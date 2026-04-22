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
import { useFakeAuth } from "@/hooks/use-fake-auth";
import { getMenuItem } from "@/lib/fixtures";
import {
  appendDraftLineItem,
  buildDraftLineItem,
  type DraftModifierSelection,
} from "@/lib/line-item";
import { dispatchCartOpen } from "@/components/cart-events";
import { scrollToMenuAnchor } from "@/components/menu/shared/scroll-to-anchor";
import { askWaiter } from "@/lib/waiter/waiter-client";
import { askMock } from "@/lib/waiter/waiter-mock";
import { useWaiterContext } from "@/lib/waiter/use-waiter-context";
import type {
  ChipAction,
  HistoricalOrder,
  WaiterChip,
  WaiterResponse,
} from "@/lib/waiter/waiter-types";
import { WaiterInput, type WaiterInputHandle } from "@/components/menu/waiter-input";

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
  const { state: auth } = useFakeAuth();
  const { context, hydrated } = useWaiterContext();
  const { draft, patchDraft } = useDraft();
  const prefersReduced = useReducedMotion();

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
  const inputRef = useRef<WaiterInputHandle | null>(null);

  // Keep the scaffold interactive while the background fetch runs —
  // under `NEXT_PUBLIC_WAITER_MODE=openrouter` the server round-trip can
  // take up to 8s, and blocking chips that whole window feels broken.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    askWaiter(null, context)
      .then((next) => {
        if (!cancelled) setResponse(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, auth.name, context.cityId]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleChip = useCallback(
    (chip: WaiterChip) => {
      const action: ChipAction = chip.action;
      if (action.type === "scroll-to") {
        scrollToMenuAnchor(action.anchor);
        return;
      }
      if (action.type === "scroll-to-triptych") {
        scrollToMenuAnchor("triptych");
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
        dispatchCartOpen();
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

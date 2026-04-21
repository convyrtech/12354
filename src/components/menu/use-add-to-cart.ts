"use client";

import { useCallback } from "react";
import { useDraft } from "@/components/draft-provider";
import { dispatchCartOpen } from "@/components/cart-events";
import type { MenuItem, MenuSnapshotItem } from "@/lib/fixtures";
import {
  appendDraftLineItem,
  buildDefaultDraftLineItem,
  buildDraftLineItem,
  getDefaultModifierSelections,
  type DraftModifierSelection,
} from "@/lib/line-item";

export type AddByItemResult = {
  added: boolean;
  reason?: "stop-list" | "absent";
};

export function useAddToCart() {
  const { draft, patchDraft } = useDraft();

  const addEntry = useCallback(
    (entry: MenuSnapshotItem): AddByItemResult => {
      if (entry.state === "sold_out") {
        return { added: false, reason: "stop-list" };
      }
      const line = buildDefaultDraftLineItem(entry.item);
      patchDraft({
        lineItems: appendDraftLineItem(draft.lineItems, line),
        orderStage: "menu",
      });
      dispatchCartOpen();
      return { added: true };
    },
    [draft.lineItems, patchDraft],
  );

  const addItemWithSelections = useCallback(
    (
      item: MenuItem,
      selections: DraftModifierSelection[],
      effectiveBasePrice?: number,
    ) => {
      const overrides = new Map(
        selections.map((selection) => [selection.groupId, selection]),
      );
      const merged = getDefaultModifierSelections(item).map(
        (fallback) => overrides.get(fallback.groupId) ?? fallback,
      );
      const line = buildDraftLineItem(item, merged, effectiveBasePrice);
      patchDraft({
        lineItems: appendDraftLineItem(draft.lineItems, line),
        orderStage: "menu",
      });
      dispatchCartOpen();
    },
    [draft.lineItems, patchDraft],
  );

  return { addEntry, addItemWithSelections };
}

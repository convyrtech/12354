"use client";

import { useCallback } from "react";
import { useDraft } from "@/components/draft-provider";
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

function dispatchCartOpen() {
  if (typeof window === "undefined") return;
  // CartPill listens for this event and opens the /menu/product drawer.
  // Reusing the same name keeps one coordination channel.
  window.dispatchEvent(new CustomEvent("raki:cart-open"));
}

// Shared hook for /menu cards. Cards inside the cream catalog no longer
// thread an onAdd prop — they consume this directly. Stop-list entries
// return { added: false } so the UI can decline without the card having
// to know about draft internals.
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
      const normalized: DraftModifierSelection[] = item.modifierGroups.map(
        (group) => {
          const override = selections.find((s) => s.groupId === group.id);
          if (override) return override;
          const fallback = getDefaultModifierSelections(item).find(
            (s) => s.groupId === group.id,
          );
          return fallback ?? { groupId: group.id, optionIds: [] };
        },
      );
      const line = buildDraftLineItem(item, normalized, effectiveBasePrice);
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

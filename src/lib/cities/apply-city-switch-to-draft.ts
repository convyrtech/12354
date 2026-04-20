import { getCity } from "@/lib/cities/cities-config";
import type { DraftPatch, OrderDraftContext } from "@/lib/draft";

export type CitySwitchOutcome =
  | { patch: DraftPatch; reason: "invalidate-routing" }
  | { patch: null; reason: "no-op" | "unknown-city" };

export function applyCitySwitchToDraft(
  draft: Pick<
    OrderDraftContext,
    "locationId" | "servicePointId" | "legalEntityId" | "lineItems"
  >,
  nextCityId: string,
): CitySwitchOutcome {
  if (!getCity(nextCityId)) {
    return { patch: null, reason: "unknown-city" };
  }

  const hasRoutingContext =
    Boolean(draft.locationId) ||
    Boolean(draft.servicePointId) ||
    Boolean(draft.legalEntityId);

  if (!hasRoutingContext && draft.lineItems.length === 0) {
    return { patch: null, reason: "no-op" };
  }

  // Nulling `locationId` here triggers the full routing cascade in
  // applyDraftPatch (draft.ts) — it clears servicePointId, legalEntityId,
  // resolverNote, delivery metadata, operator state, and bumps
  // contextVersion / invalidates cart when items exist. Keeping this patch
  // minimal avoids duplicating the cascade contract.
  return {
    patch: { locationId: null },
    reason: "invalidate-routing",
  };
}

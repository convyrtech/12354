import type {
  DeliveryQuote,
  GeoAddressConfidence,
  GeoDeliveryState,
} from "./types";

/**
 * Minimum shape required to decide whether the guest is allowed to hit
 * "Подтвердить адрес". Kept structural (not tied to the full CommittedAddress
 * shape) so the gate can be tested in isolation and reused from future
 * surfaces (mobile flow, operator back-office).
 */
export type CanConfirmInput = {
  /** The guest-committed address. `null` before the first successful
   *  suggestion pick / drag commit / geolocation. */
  committed: {
    lat: number;
    lng: number;
    normalizedAddress: string;
    confidence: GeoAddressConfidence;
    source: "suggestion" | "map_pin";
  } | null;
  /** The latest resolved DeliveryQuote from /api/delivery/quote. `null`
   *  while in-flight or on error. */
  activeQuote: Pick<DeliveryQuote, "zone"> | null;
  /** True while the quote request is in flight. */
  isQuoteLoading: boolean;
  /** True while a reverse-geocode is in flight (drag commit path only). */
  isReverseLoading: boolean;
};

/**
 * Decide whether the "Подтвердить адрес" CTA should be enabled.
 *
 * All four guards must pass:
 *   1. Guest has committed an address (`committed !== null`)
 *   2. Quote has resolved (`activeQuote !== null`)
 *   3. Zone state is not "out-of-zone" (we can actually deliver there)
 *   4. No background request is still upgrading the data we're about to
 *      persist: no quote in flight AND no reverse in flight for map-pin drops
 *
 * Guard 4 closes the race where the quote arrives faster than reverse-geocode,
 * unblocks the CTA, and the guest confirms with a placeholder address +
 * confidence="low". The operator would then have to call back.
 */
export function canConfirmDeliveryAddress(input: CanConfirmInput): boolean {
  const { committed, activeQuote, isQuoteLoading, isReverseLoading } = input;

  if (!committed) return false;
  if (!activeQuote) return false;
  if (isQuoteLoading) return false;

  const state: GeoDeliveryState = activeQuote.zone.deliveryState;
  if (state === "out-of-zone") return false;

  // Map-pin commits start with confidence="low" and a placeholder label;
  // reverse upgrades them. Suggestion commits already have final data on
  // arrival, so reverse loading is irrelevant to them.
  if (committed.source === "map_pin" && isReverseLoading) return false;

  return true;
}

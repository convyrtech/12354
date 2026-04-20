import type { CityId } from "@/lib/cities/cities-config";
import {
  resolveAvailabilityForCity,
  type CityAvailabilityResult,
} from "@/lib/cities/resolve-city-availability";
import type {
  FulfillmentMode,
  MenuAvailabilityState,
  MenuItem,
  MenuSnapshotItem,
} from "@/lib/fixtures";
import { menuItems } from "@/lib/fixtures";

const VISIBLE_STATES: MenuAvailabilityState[] = ["available", "sold_out"];

function computePriceDelta(
  item: MenuItem,
  result: CityAvailabilityResult,
): number {
  // Kitchen- or legacy-location-level priceDeltas are not modelled per-city
  // yet; keep 0 until Phase 2 of multi-kitchen routing. Source of truth for
  // price deltas remains the modifier groups themselves.
  void item;
  void result;
  return 0;
}

function buildSnapshotItem(
  item: MenuItem,
  cityId: CityId,
  fulfillmentMode: FulfillmentMode,
): MenuSnapshotItem {
  const result = resolveAvailabilityForCity(item, cityId, fulfillmentMode);
  const priceDelta = computePriceDelta(item, result);
  return {
    item,
    state: result.state,
    reason: result.reason,
    effectiveBasePrice: item.basePrice + priceDelta,
    priceDelta,
  };
}

export function getMenuForCity(
  cityId: CityId,
  fulfillmentMode: FulfillmentMode,
): MenuSnapshotItem[] {
  return menuItems
    .map((item) => buildSnapshotItem(item, cityId, fulfillmentMode))
    .filter((entry) => VISIBLE_STATES.includes(entry.state));
}

export function getCategoryItems(
  snapshot: MenuSnapshotItem[],
  categorySlug: string,
  subcategory?: string,
): MenuSnapshotItem[] {
  return snapshot.filter((entry) => {
    if (entry.item.categorySlug !== categorySlug) return false;
    if (subcategory && entry.item.subcategory !== subcategory) return false;
    return true;
  });
}

export function getSignatureItems(
  snapshot: MenuSnapshotItem[],
  limit: number = 3,
): MenuSnapshotItem[] {
  return snapshot.filter((entry) => entry.item.isSignature).slice(0, limit);
}

export function resolveItemAvailability(
  item: MenuItem,
  cityId: CityId,
  fulfillmentMode: FulfillmentMode,
): CityAvailabilityResult {
  return resolveAvailabilityForCity(item, cityId, fulfillmentMode);
}

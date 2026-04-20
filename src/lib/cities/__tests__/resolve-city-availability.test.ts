import { describe, expect, it } from "vitest";
import type { MenuItem } from "@/lib/fixtures";
import { resolveAvailabilityForCity } from "@/lib/cities/resolve-city-availability";

function makeItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: "item_test",
    category: "Тест",
    productFamily: "test",
    name: "Тестовая позиция",
    description: "",
    basePrice: 1000,
    availableFor: ["delivery", "pickup"],
    modifierGroups: [],
    ...overrides,
  } satisfies MenuItem;
}

describe("resolveAvailabilityForCity", () => {
  it("returns hidden for unknown city", () => {
    const result = resolveAvailabilityForCity(makeItem(), "atlantis", "delivery");
    expect(result.state).toBe("hidden");
    expect(result.reason).toContain("не найден");
  });

  it("returns hidden for coming-soon city", () => {
    const result = resolveAvailabilityForCity(makeItem(), "krasnodar", "delivery");
    expect(result.state).toBe("hidden");
    expect(result.contributingKitchens).toHaveLength(0);
  });

  it("returns available for moscow when legacy location is available", () => {
    const item = makeItem({
      locationAvailability: [
        { locationId: "loc_lesnoy_01", state: "available" },
      ],
    });
    const result = resolveAvailabilityForCity(item, "moscow", "delivery");
    expect(result.state).toBe("available");
    expect(result.contributingKitchens[0]).toMatchObject({
      kitchenId: "osorgino",
      state: "available",
    });
  });

  it("prefers direct kitchenAvailability over legacy mapping", () => {
    const item = makeItem({
      kitchenAvailability: [{ kitchenId: "osorgino", state: "sold_out" }],
      locationAvailability: [
        { locationId: "loc_lesnoy_01", state: "available" },
      ],
    });
    const result = resolveAvailabilityForCity(item, "moscow", "delivery");
    expect(result.state).toBe("sold_out");
  });

  it("filters legacy service points by fulfillment mode", () => {
    const item = makeItem({
      servicePointAvailability: [
        { servicePointId: "sp_lesnoy_dispatch_01", state: "sold_out" },
        { servicePointId: "sp_lesnoy_pickup_01", state: "available" },
      ],
    });
    // dispatch_01 is a dispatch_kitchen — drives delivery resolution
    expect(resolveAvailabilityForCity(item, "moscow", "delivery").state).toBe(
      "sold_out",
    );
    // pickup_01 is a pickup_counter — drives pickup resolution
    expect(resolveAvailabilityForCity(item, "moscow", "pickup").state).toBe(
      "available",
    );
  });

  it("falls back to item.availableFor default when no kitchen mapping exists", () => {
    const deliveryOnly = makeItem({ availableFor: ["delivery"] });
    const pickupResult = resolveAvailabilityForCity(
      deliveryOnly,
      "moscow",
      "pickup",
    );
    expect(pickupResult.state).toBe("hidden");

    const deliveryResult = resolveAvailabilityForCity(
      deliveryOnly,
      "moscow",
      "delivery",
    );
    expect(deliveryResult.state).toBe("available");
  });
});

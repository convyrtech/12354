import { describe, expect, it } from "vitest";
import { applyCitySwitchToDraft } from "@/lib/cities/apply-city-switch-to-draft";
import type { OrderDraftContext } from "@/lib/draft";

function makeDraft(overrides: Partial<OrderDraftContext> = {}): OrderDraftContext {
  return {
    locationId: null,
    servicePointId: null,
    legalEntityId: null,
    lineItems: [],
    ...overrides,
  } as unknown as OrderDraftContext;
}

describe("applyCitySwitchToDraft", () => {
  it("returns no-op when draft has no routing context and empty cart", () => {
    const result = applyCitySwitchToDraft(makeDraft(), "moscow");
    expect(result.patch).toBeNull();
    expect(result.reason).toBe("no-op");
  });

  it("returns minimal routing-null patch when switching with items in cart", () => {
    const draft = makeDraft({
      locationId: "loc_lesnoy_01",
      servicePointId: "sp_lesnoy_dispatch_01",
      legalEntityId: "le_raki_core",
      lineItems: [{ itemId: "item_crayfish_boiled" } as never],
    });
    const result = applyCitySwitchToDraft(draft, "moscow");
    expect(result.reason).toBe("invalidate-routing");
    expect(result.patch).toEqual({ locationId: null });
  });

  it("returns unknown-city when target city is missing", () => {
    const result = applyCitySwitchToDraft(makeDraft(), "atlantis");
    expect(result.patch).toBeNull();
    expect(result.reason).toBe("unknown-city");
  });
});

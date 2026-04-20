import { describe, expect, it } from "vitest";
import {
  getCategoryItems,
  getMenuForCity,
  getSignatureItems,
} from "@/lib/menu/menu-queries";

describe("getMenuForCity", () => {
  it("returns visible items for moscow delivery", () => {
    const snapshot = getMenuForCity("moscow", "delivery");
    expect(snapshot.length).toBeGreaterThan(5);
    for (const entry of snapshot) {
      expect(["available", "sold_out"]).toContain(entry.state);
    }
  });

  it("hides items whose fulfillment mode is not supported", () => {
    const pickup = getMenuForCity("moscow", "pickup");
    const hasCrabWhole = pickup.some((entry) => entry.item.id === "item_king_crab_whole");
    expect(hasCrabWhole).toBe(false);
  });

  it("returns empty list for coming-soon cities", () => {
    const krasnodar = getMenuForCity("krasnodar", "delivery");
    expect(krasnodar).toHaveLength(0);
  });
});

describe("getCategoryItems", () => {
  it("filters by categorySlug", () => {
    const snapshot = getMenuForCity("moscow", "delivery");
    const mussels = getCategoryItems(snapshot, "mussels");
    for (const entry of mussels) {
      expect(entry.item.categorySlug).toBe("mussels");
    }
    expect(mussels.length).toBeGreaterThanOrEqual(4);
  });

  it("filters раки by subcategory", () => {
    const snapshot = getMenuForCity("moscow", "delivery");
    const boiled = getCategoryItems(snapshot, "raki", "boiled");
    const fried = getCategoryItems(snapshot, "raki", "fried");
    const live = getCategoryItems(snapshot, "raki", "live");
    expect(boiled.map((e) => e.item.id)).toContain("item_crayfish_boiled");
    expect(fried.map((e) => e.item.id)).toContain("item_crayfish_fried");
    expect(live.map((e) => e.item.id)).toContain("item_crayfish_live");
  });
});

describe("getSignatureItems", () => {
  it("picks up isSignature items capped by limit", () => {
    const snapshot = getMenuForCity("moscow", "delivery");
    const picks = getSignatureItems(snapshot, 3);
    expect(picks).toHaveLength(3);
    for (const entry of picks) {
      expect(entry.item.isSignature).toBe(true);
    }
  });
});

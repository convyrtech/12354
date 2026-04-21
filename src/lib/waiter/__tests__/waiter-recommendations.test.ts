import { describe, expect, it } from "vitest";
import { MOCK_ANDREY } from "@/lib/waiter/mock-user-andrey";
import {
  allMenuItemsAsSnapshot,
  pickRecommendations,
} from "@/lib/waiter/waiter-recommendations";
import type { WaiterContext } from "@/lib/waiter/waiter-types";

function guestContext(): WaiterContext {
  return {
    user: null,
    cart: [],
    cityId: "moscow",
    now: new Date("2026-04-20T18:00:00Z"),
  };
}

function andreyContext(): WaiterContext {
  return {
    user: {
      name: MOCK_ANDREY.name,
      phone: MOCK_ANDREY.phone,
      history: MOCK_ANDREY.orderHistory,
      paymentPreference: MOCK_ANDREY.paymentPreference,
      preferredCity: MOCK_ANDREY.preferredCity,
    },
    cart: [],
    cityId: "moscow",
    now: new Date("2026-04-20T18:00:00Z"),
  };
}

describe("pickRecommendations", () => {
  it("returns signature items for guest (no history)", () => {
    const picks = pickRecommendations(guestContext(), allMenuItemsAsSnapshot(), 3);
    expect(picks).toHaveLength(3);
    for (const pick of picks) {
      expect(pick.reason).toBe("signature");
    }
  });

  it("returning: first pick is the most frequent item (раки варёные)", () => {
    const picks = pickRecommendations(andreyContext(), allMenuItemsAsSnapshot(), 3);
    expect(picks[0].itemId).toBe("item_crayfish_boiled");
    expect(picks[0].reason).toBe("frequent");
  });

  it("returning: companion is мидии or вонголе after boiled раки anchor", () => {
    const picks = pickRecommendations(andreyContext(), allMenuItemsAsSnapshot(), 3);
    const companion = picks.find((p) => p.reason === "companion");
    expect(companion).toBeDefined();
    expect(companion?.itemId).toMatch(/^item_(mussels|vongole)_/);
  });

  it("returning: novelty picks a badge=new or new signature item", () => {
    const picks = pickRecommendations(andreyContext(), allMenuItemsAsSnapshot(), 3);
    const novelty = picks.find((p) => p.reason === "novelty");
    expect(novelty).toBeDefined();
  });

  it("returns empty list gracefully when snapshot is empty", () => {
    const picks = pickRecommendations(andreyContext(), [], 3);
    expect(picks).toHaveLength(0);
  });

  it("caps results to count parameter", () => {
    const picks = pickRecommendations(andreyContext(), allMenuItemsAsSnapshot(), 2);
    expect(picks).toHaveLength(2);
  });
});

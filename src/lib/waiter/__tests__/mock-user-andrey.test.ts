import { describe, expect, it } from "vitest";
import { getMenuItem } from "@/lib/fixtures";
import { MOCK_ANDREY } from "@/lib/waiter/mock-user-andrey";

describe("MOCK_ANDREY data integrity", () => {
  it("all history itemIds resolve to real fixtures", () => {
    for (const order of MOCK_ANDREY.orderHistory ?? []) {
      for (const line of order.items) {
        const item = getMenuItem(line.itemId);
        expect(item, `missing ${line.itemId}`).toBeDefined();
      }
    }
  });

  it("all modifier group/option ids resolve on their items", () => {
    for (const order of MOCK_ANDREY.orderHistory ?? []) {
      for (const line of order.items) {
        const item = getMenuItem(line.itemId);
        if (!item || !line.modifiers) continue;
        for (const [groupId, optionId] of Object.entries(line.modifiers)) {
          const group = item.modifierGroups.find((g) => g.id === groupId);
          expect(group, `${line.itemId} missing group ${groupId}`).toBeDefined();
          const option = group?.options.find((o) => o.id === optionId);
          expect(
            option,
            `${line.itemId}/${groupId} missing option ${optionId}`,
          ).toBeDefined();
        }
      }
    }
  });

  it("raki boiled L том-ям anchor is present in recent history", () => {
    const recent = MOCK_ANDREY.orderHistory?.[0];
    expect(recent).toBeDefined();
    const raki = recent?.items.find(
      (line) => line.itemId === "item_crayfish_boiled",
    );
    expect(raki?.modifiers?.mg_boiled_recipe).toMatch(/recipe_(spicy_tomato|tom_yam|adjika)/);
  });
});

import { describe, expect, it } from "vitest";
import type { DraftLineItem } from "@/lib/line-item";
import { computeBundledSubItems } from "@/lib/menu/bundled-accessories";

function makeLine(partial: Partial<DraftLineItem>): DraftLineItem {
  return {
    itemId: "item_crayfish_boiled",
    itemName: "Варёные раки L",
    quantity: 1,
    basePrice: 4900,
    unitPrice: 5900,
    totalPrice: 5900,
    selections: [
      { groupId: "mg_boiled_weight", optionIds: ["weight_1kg"] },
    ],
    summaryLines: [],
    ...partial,
  };
}

describe("computeBundledSubItems", () => {
  it("returns one pair of gloves per kilo of раки (default 1 кг)", () => {
    const subs = computeBundledSubItems(makeLine({}));
    expect(subs).toHaveLength(1);
    expect(subs[0].id).toBe("accessory_gloves");
    expect(subs[0].quantity).toBe(1);
  });

  it("scales gloves with 2 кг selection", () => {
    const line = makeLine({
      selections: [{ groupId: "mg_boiled_weight", optionIds: ["weight_2kg"] }],
    });
    const subs = computeBundledSubItems(line);
    expect(subs[0].quantity).toBe(2);
  });

  it("quantity-based bundled scales with lineItem quantity (мидии → гренки)", () => {
    const line = makeLine({
      itemId: "item_mussels_pesto",
      itemName: "Мидии в соусе Песто / 1 кг",
      quantity: 3,
      selections: [
        {
          groupId: "mg_mussels_pesto_weight",
          optionIds: ["mussels_pesto_1kg"],
        },
      ],
    });
    const subs = computeBundledSubItems(line);
    expect(subs).toHaveLength(1);
    expect(subs[0].id).toBe("accessory_bread_toast");
    // perUnit=kg × 1kg × quantity 3 → 3 гренки
    expect(subs[0].quantity).toBe(3);
  });

  it("returns empty array when item has no bundled accessories", () => {
    const line = makeLine({
      itemId: "item_caviar_red",
      selections: [{ groupId: "mg_caviar_pack", optionIds: ["caviar_pack_250"] }],
    });
    expect(computeBundledSubItems(line)).toHaveLength(0);
  });

  it("returns empty array when itemId no longer exists in fixtures", () => {
    const line = makeLine({ itemId: "item_removed_legacy" });
    expect(computeBundledSubItems(line)).toHaveLength(0);
  });
});

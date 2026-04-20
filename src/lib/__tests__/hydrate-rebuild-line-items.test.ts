import { describe, expect, it } from "vitest";
import { hydrateStoredDraft } from "@/lib/draft";
import { buildDraftLineItem, getDefaultModifierSelections, rebuildDraftLineItem } from "@/lib/line-item";
import { getMenuItem } from "@/lib/fixtures";

describe("hydrateStoredDraft — line item rebuild", () => {
  it("drops line items whose itemId no longer exists in fixtures", () => {
    const stored = {
      lineItems: [
        {
          itemId: "item_nonexistent_removed",
          itemName: "Removed item",
          quantity: 1,
          basePrice: 1000,
          unitPrice: 1000,
          totalPrice: 1000,
          selections: [],
          summaryLines: [],
        },
      ],
    };
    const hydrated = hydrateStoredDraft(stored);
    expect(hydrated.lineItems).toHaveLength(0);
  });

  it("rebuilds unitPrice when fixture modifier groups add a new required recipe", () => {
    // Simulates a legacy stored draft for fried raki (before fried recipe
    // group existed). Selection only has size — after hydrate the new
    // fried_recipe group picks its default (creamy-garlic +0), so unitPrice
    // equals current basePrice + size delta.
    const stored = {
      lineItems: [
        {
          itemId: "item_crayfish_fried",
          itemName: "Жареные раки L",
          quantity: 1,
          basePrice: 5700,
          unitPrice: 6700, // legacy cached
          totalPrice: 6700,
          selections: [
            { groupId: "mg_fried_size_tier", optionIds: ["fried_size_l"] },
          ],
          summaryLines: ["Размер: L • 11-13 шт/кг"],
        },
      ],
    };

    const hydrated = hydrateStoredDraft(stored);
    expect(hydrated.lineItems).toHaveLength(1);
    const line = hydrated.lineItems[0];
    // basePrice 5700 + size_l delta +1000 + recipe default +0 + weight_1kg +0
    expect(line.unitPrice).toBe(6700);
    // Selections should now include all required groups
    const groupIds = line.selections.map((sel) => sel.groupId);
    expect(groupIds).toContain("mg_fried_size_tier");
    expect(groupIds).toContain("mg_fried_recipe");
    expect(groupIds).toContain("mg_fried_weight");
  });

  it("applies new live specs group default +200 to pre-existing live raki drafts", () => {
    const stored = {
      lineItems: [
        {
          itemId: "item_crayfish_live",
          itemName: "Живые раки L",
          quantity: 1,
          basePrice: 4700,
          unitPrice: 5700, // legacy cached, no specs yet
          totalPrice: 5700,
          selections: [
            { groupId: "mg_live_size_tier", optionIds: ["live_size_l"] },
          ],
          summaryLines: ["Размер: L"],
        },
      ],
    };
    const hydrated = hydrateStoredDraft(stored);
    const line = hydrated.lineItems[0];
    // basePrice 4700 + size_l +1000 + spice classic +200 + weight_1kg +0
    expect(line.unitPrice).toBe(5900);
    const groupIds = line.selections.map((sel) => sel.groupId);
    expect(groupIds).toContain("mg_live_spice");
  });

  it("leaves unchanged boiled raki lines byte-identical after rebuild", () => {
    // Boiled raki has no new modifier groups in this release — round-trip
    // should be a no-op at the value level so memoized consumers stay stable.
    const stored = {
      lineItems: [
        {
          itemId: "item_crayfish_boiled",
          itemName: "Варёные раки L",
          quantity: 1,
          basePrice: 4900,
          unitPrice: 5900, // basePrice + size_l +1000 + classic +0 + 1kg +0
          totalPrice: 5900,
          selections: [
            { groupId: "mg_boiled_size_tier", optionIds: ["size_l"] },
            { groupId: "mg_boiled_recipe", optionIds: ["recipe_classic"] },
            { groupId: "mg_boiled_weight", optionIds: ["weight_1kg"] },
            { groupId: "mg_boiled_salt_balance", optionIds: ["salt_classic"] },
            { groupId: "mg_boiled_heat_level", optionIds: ["heat_none"] },
          ],
          summaryLines: [],
        },
      ],
    };
    const hydrated = hydrateStoredDraft(stored);
    const line = hydrated.lineItems[0];
    expect(line.unitPrice).toBe(5900);
    expect(line.quantity).toBe(1);
  });

  it("falls back to default when stored recipe id no longer exists", () => {
    const stored = {
      lineItems: [
        {
          itemId: "item_crayfish_boiled",
          itemName: "Варёные раки L",
          quantity: 1,
          basePrice: 4900,
          unitPrice: 5900,
          totalPrice: 5900,
          selections: [
            { groupId: "mg_boiled_size_tier", optionIds: ["size_l"] },
            { groupId: "mg_boiled_recipe", optionIds: ["recipe_legacy_removed"] },
            { groupId: "mg_boiled_weight", optionIds: ["weight_1kg"] },
          ],
          summaryLines: [],
        },
      ],
    };
    const hydrated = hydrateStoredDraft(stored);
    const line = hydrated.lineItems[0];
    const recipe = line.selections.find((sel) => sel.groupId === "mg_boiled_recipe");
    expect(recipe?.optionIds[0]).toBe("recipe_classic");
    // Classic recipe is +0; base + size_l +1000 + weight_1kg +0 = 5900
    expect(line.unitPrice).toBe(5900);
  });

  it("returns same reference when rebuild is a structural no-op", () => {
    const item = getMenuItem("item_crayfish_boiled");
    expect(item).toBeDefined();
    if (!item) return;
    const selections = getDefaultModifierSelections(item);
    const built = buildDraftLineItem(item, selections);
    const rebuilt = rebuildDraftLineItem(item, built);
    expect(rebuilt).toBe(built);
  });

  it("preserves quantity across rebuild", () => {
    const stored = {
      lineItems: [
        {
          itemId: "item_mussels_pesto",
          itemName: "Мидии в соусе Песто / 1 кг",
          quantity: 3,
          basePrice: 3000,
          unitPrice: 3000,
          totalPrice: 9000,
          selections: [
            { groupId: "mg_mussels_pesto_weight", optionIds: ["mussels_pesto_1kg"] },
          ],
          summaryLines: [],
        },
      ],
    };
    const hydrated = hydrateStoredDraft(stored);
    const line = hydrated.lineItems[0];
    expect(line.quantity).toBe(3);
    expect(line.totalPrice).toBe(line.unitPrice * 3);
  });
});

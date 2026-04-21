import { describe, expect, it } from "vitest";
import { getMenuItem } from "@/lib/fixtures";
import {
  getDefaultRecipeOptionId,
  getRecipeGroup,
  getSizeGroup,
  getWeightGroup,
} from "@/lib/menu/recipes";

describe("raki recipe helpers", () => {
  it("locates boiled recipe group with classic as default", () => {
    const item = getMenuItem("item_crayfish_boiled");
    expect(item).toBeDefined();
    if (!item) return;
    const group = getRecipeGroup(item, "boiled");
    expect(group).not.toBeNull();
    expect(getDefaultRecipeOptionId(group!)).toBe("recipe_classic");
  });

  it("locates fried recipe group with creamy-garlic as default", () => {
    const item = getMenuItem("item_crayfish_fried");
    expect(item).toBeDefined();
    if (!item) return;
    const group = getRecipeGroup(item, "fried");
    expect(group).not.toBeNull();
    expect(getDefaultRecipeOptionId(group!)).toBe("fried_recipe_creamy_garlic");
  });

  it("locates live spice group with classic as default +200", () => {
    const item = getMenuItem("item_crayfish_live");
    expect(item).toBeDefined();
    if (!item) return;
    const group = getRecipeGroup(item, "live");
    expect(group).not.toBeNull();
    const defaultId = getDefaultRecipeOptionId(group!);
    expect(defaultId).toBe("live_spice_classic");
    const defaultOption = group!.options.find((o) => o.id === defaultId);
    expect(defaultOption?.priceDelta).toBe(200);
  });

  it("size + weight groups resolve for all three subcategories", () => {
    for (const sub of ["boiled", "fried", "live"] as const) {
      const itemId =
        sub === "boiled"
          ? "item_crayfish_boiled"
          : sub === "fried"
            ? "item_crayfish_fried"
            : "item_crayfish_live";
      const item = getMenuItem(itemId);
      if (!item) throw new Error(`missing ${itemId}`);
      expect(getSizeGroup(item, sub)).not.toBeNull();
      expect(getWeightGroup(item, sub)).not.toBeNull();
    }
  });
});

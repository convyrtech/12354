import { describe, expect, it } from "vitest";
import { getMenuItem } from "@/lib/fixtures";

// The size-table price math lives inline in raki-section.tsx as
//   pricePerKg = entry.effectiveBasePrice + sizeOption.priceDelta + recipeDelta
// This test pins that formula against real fixtures so changes to modifier
// ids or deltas surface immediately.

describe("Раки size table price math", () => {
  it("том-ям on boiled L adds +200 to base+size (varёные L = 5900+200)", () => {
    const item = getMenuItem("item_crayfish_boiled");
    if (!item) throw new Error("missing boiled");
    const effectiveBase = item.basePrice; // 4900 on active kitchen
    const sizeGroup = item.modifierGroups.find(
      (g) => g.id === "mg_boiled_size_tier",
    );
    const recipeGroup = item.modifierGroups.find(
      (g) => g.id === "mg_boiled_recipe",
    );
    const sizeL = sizeGroup?.options.find((o) => o.id === "size_l");
    const tomYam = recipeGroup?.options.find((o) => o.id === "recipe_tom_yam");
    expect(sizeL?.priceDelta).toBe(1000);
    expect(tomYam?.priceDelta).toBe(200);
    const priceWithTomYam =
      effectiveBase + (sizeL?.priceDelta ?? 0) + (tomYam?.priceDelta ?? 0);
    expect(priceWithTomYam).toBe(6100);
  });

  it("донской on boiled L keeps base+size price (no delta)", () => {
    const item = getMenuItem("item_crayfish_boiled");
    if (!item) throw new Error("missing boiled");
    const recipeGroup = item.modifierGroups.find(
      (g) => g.id === "mg_boiled_recipe",
    );
    const donskoy = recipeGroup?.options.find(
      (o) => o.id === "recipe_donskoy",
    );
    expect(donskoy).toBeDefined();
    expect(donskoy?.priceDelta).toBe(0);
  });

  it("блю чиз on fried L adds +200", () => {
    const item = getMenuItem("item_crayfish_fried");
    if (!item) throw new Error("missing fried");
    const recipeGroup = item.modifierGroups.find(
      (g) => g.id === "mg_fried_recipe",
    );
    const blueCheese = recipeGroup?.options.find(
      (o) => o.id === "fried_recipe_blue_cheese",
    );
    expect(blueCheese?.priceDelta).toBe(200);
  });

  it("live default spice classic adds +200 (all live specs are +200)", () => {
    const item = getMenuItem("item_crayfish_live");
    if (!item) throw new Error("missing live");
    const recipeGroup = item.modifierGroups.find(
      (g) => g.id === "mg_live_spice",
    );
    expect(recipeGroup?.label).toBe("Рецепт");
    const classic = recipeGroup?.options.find(
      (o) => o.id === "live_spice_classic",
    );
    expect(classic?.priceDelta).toBe(200);
  });
});

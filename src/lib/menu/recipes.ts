import type { MenuItem, ModifierGroup } from "@/lib/fixtures";

export type RakiSubcategory = "boiled" | "live" | "fried";

// Group-ids are authored in fixtures and must stay stable — the IDs below
// are read by raki-section and the add-to-cart flow to locate the recipe /
// spice group for each subcategory.
export const RAKI_RECIPE_GROUP_ID: Record<RakiSubcategory, string> = {
  boiled: "mg_boiled_recipe",
  fried: "mg_fried_recipe",
  live: "mg_live_spice",
};

export const RAKI_SIZE_GROUP_ID: Record<RakiSubcategory, string> = {
  boiled: "mg_boiled_size_tier",
  fried: "mg_fried_size_tier",
  live: "mg_live_size_tier",
};

export const RAKI_WEIGHT_GROUP_ID: Record<RakiSubcategory, string> = {
  boiled: "mg_boiled_weight",
  fried: "mg_fried_weight",
  live: "mg_live_weight",
};

export function getRecipeGroup(
  item: MenuItem,
  subcategory: RakiSubcategory,
): ModifierGroup | null {
  const groupId = RAKI_RECIPE_GROUP_ID[subcategory];
  return item.modifierGroups.find((g) => g.id === groupId) ?? null;
}

export function getSizeGroup(
  item: MenuItem,
  subcategory: RakiSubcategory,
): ModifierGroup | null {
  const groupId = RAKI_SIZE_GROUP_ID[subcategory];
  return item.modifierGroups.find((g) => g.id === groupId) ?? null;
}

export function getWeightGroup(
  item: MenuItem,
  subcategory: RakiSubcategory,
): ModifierGroup | null {
  const groupId = RAKI_WEIGHT_GROUP_ID[subcategory];
  return item.modifierGroups.find((g) => g.id === groupId) ?? null;
}

export function getDefaultRecipeOptionId(group: ModifierGroup): string {
  return group.options[0]?.id ?? "";
}

import type { BundledAccessory, MenuItem } from "@/lib/fixtures";
import { getMenuItem } from "@/lib/fixtures";
import type { DraftLineItem } from "@/lib/line-item";

export type BundledSubItem = {
  parentItemId: string;
  id: string;
  title: string;
  quantity: number;
  note?: string;
};

// Some items encode weight directly in the option label ("1 кг"), while
// others expose it through explicit weightAbsoluteKg / weightDeltaKg fields.
// Support both shapes when counting bundled accessories.
const KG_LABEL_RE = /(\d+(?:[.,]\d+)?)\s*кг/i;

function parseKgFromLabel(label: string | undefined): number | null {
  if (!label) return null;
  const match = label.match(KG_LABEL_RE);
  if (!match) return null;
  const value = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function resolveWeightKg(lineItem: DraftLineItem, item: MenuItem): number {
  let fallbackWeightKg: number | null = null;
  let absoluteWeightKg: number | null = null;
  let extraWeightKg = 0;
  let hasExplicitWeightConfig = false;

  for (const selection of lineItem.selections) {
    const group = item.modifierGroups.find((g) => g.id === selection.groupId);
    if (!group) continue;
    const first = selection.optionIds[0];
    if (!first) continue;
    const option = group.options.find((o) => o.id === first);
    if (!option) continue;

    if (typeof option.weightAbsoluteKg === "number") {
      absoluteWeightKg = option.weightAbsoluteKg;
      hasExplicitWeightConfig = true;
      continue;
    }

    if (typeof option.weightDeltaKg === "number") {
      extraWeightKg += option.weightDeltaKg;
      hasExplicitWeightConfig = true;
      continue;
    }

    const kg = parseKgFromLabel(option.label);
    if (kg != null) {
      fallbackWeightKg = kg;
    }
  }

  if (hasExplicitWeightConfig) {
    return (absoluteWeightKg ?? item.commercialRules?.minimumWeightKg ?? 1) + extraWeightKg;
  }

  return fallbackWeightKg ?? item.commercialRules?.minimumWeightKg ?? 1;
}

export function computeBundledSubItems(
  lineItem: DraftLineItem,
): BundledSubItem[] {
  const item = getMenuItem(lineItem.itemId);
  if (!item || !item.bundledAccessories?.length) return [];

  const quantity = Math.max(1, lineItem.quantity);
  const weightKg = resolveWeightKg(lineItem, item);

  return item.bundledAccessories.map((accessory: BundledAccessory) => {
    const totalUnits =
      accessory.perUnit === "kg" ? weightKg * quantity : quantity;
    return {
      parentItemId: item.id,
      id: accessory.id,
      title: accessory.title,
      quantity: Math.ceil(accessory.quantity * totalUnits),
      note: accessory.note,
    };
  });
}

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

// Weight-based items (раки/мидии/вонголе) encode the kilo count through a
// modifier option whose label starts with the numeric kg (e.g. "1 кг",
// "2 кг"). We read the label rather than priceDelta because a 0 priceDelta
// option still represents 1 kg.
const KG_LABEL_RE = /(\d+(?:[.,]\d+)?)\s*кг/i;

function parseKgFromLabel(label: string | undefined): number | null {
  if (!label) return null;
  const match = label.match(KG_LABEL_RE);
  if (!match) return null;
  const value = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function resolveWeightKg(lineItem: DraftLineItem, item: MenuItem): number {
  // Find the weight group used for this item, if any. Weight groups are
  // opt-in — fixtures use `mg_*_weight` or variant-specific ids like
  // `mg_mussels_weight`. We look for a selection whose option label matches
  // a kg pattern.
  for (const selection of lineItem.selections) {
    const group = item.modifierGroups.find((g) => g.id === selection.groupId);
    if (!group) continue;
    const first = selection.optionIds[0];
    if (!first) continue;
    const option = group.options.find((o) => o.id === first);
    const kg = parseKgFromLabel(option?.label);
    if (kg != null) return kg;
  }
  return 1;
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

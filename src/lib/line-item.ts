import type { MenuItem } from "@/lib/fixtures";

export type DraftModifierSelection = {
  groupId: string;
  optionIds: string[];
};

export type DraftLineItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  totalPrice: number;
  selections: DraftModifierSelection[];
  summaryLines: string[];
  quantityEditable?: boolean;
  mergeBehavior?: "merge" | "separate";
};

function normalizeSelection(group: MenuItem["modifierGroups"][number], optionIds: string[]) {
  const knownOptionIds = optionIds.filter((optionId) =>
    group.options.some((option) => option.id === optionId),
  );
  const deduped = Array.from(new Set(knownOptionIds)).slice(0, group.maxSelections);

  if (deduped.length >= group.minSelections) {
    return deduped;
  }

  const fallbackIds = group.options
    .filter((option) => !deduped.includes(option.id))
    .slice(0, group.minSelections - deduped.length)
    .map((option) => option.id);

  return [...deduped, ...fallbackIds];
}

function getPreferredDefaultOptionIds(group: MenuItem["modifierGroups"][number]) {
  const preferredOptionIds = [
    "size_m",
    "fried_size_m",
    "live_size_m",
    "recipe_classic",
    "weight_1kg",
    "salt_classic",
    "heat_none",
    "fried_heat_regular",
  ];

  const matched = preferredOptionIds.filter((optionId) =>
    group.options.some((option) => option.id === optionId),
  );

  if (matched.length > 0) {
    return matched.slice(0, group.minSelections);
  }

  return group.options.slice(0, group.minSelections).map((option) => option.id);
}

function getSelectedOptionLabel(
  group: MenuItem["modifierGroups"][number] | undefined,
  optionIds: string[],
) {
  if (!group) {
    return null;
  }

  const firstOptionId = optionIds[0];
  const option = group.options.find((candidate) => candidate.id === firstOptionId);
  return option?.label ?? null;
}

function getConfiguredItemName(
  item: MenuItem,
  selections: DraftModifierSelection[],
) {
  const sizeGroup = item.modifierGroups.find((group) => group.label === "Размер");
  const sizeSelection = selections.find((selection) => selection.groupId === sizeGroup?.id);
  const sizeLabel = getSelectedOptionLabel(sizeGroup, sizeSelection?.optionIds ?? []);
  const sizeTier = sizeLabel?.split(" • ")[0];

  if (
    sizeTier &&
    (item.productFamily === "boiled" ||
      item.productFamily === "fried" ||
      item.productFamily === "live")
  ) {
    return `${item.category} ${sizeTier}`;
  }

  return item.name;
}

export function getDefaultModifierSelections(item: MenuItem): DraftModifierSelection[] {
  return item.modifierGroups.map((group) => ({
    groupId: group.id,
    optionIds: normalizeSelection(group, getPreferredDefaultOptionIds(group)),
  }));
}

export function buildDraftLineItem(
  item: MenuItem,
  rawSelections: DraftModifierSelection[],
  basePriceOverride?: number,
): DraftLineItem {
  const basePrice = basePriceOverride ?? item.basePrice;
  const isWeightBased = item.commercialRules?.orderingModel === "weight_based";
  let unitPrice = basePrice;

  const selections = item.modifierGroups.map((group) => {
    const requested = rawSelections.find((selection) => selection.groupId === group.id);
    const optionIds = normalizeSelection(group, requested?.optionIds ?? []);

    optionIds.forEach((optionId) => {
      const option = group.options.find((candidate) => candidate.id === optionId);

      if (option) {
        unitPrice += option.priceDelta;
      }
    });

    return {
      groupId: group.id,
      optionIds,
    };
  });

  const summaryLines = item.modifierGroups
    .map((group) => {
      const selection = selections.find((entry) => entry.groupId === group.id);
      const labels = (selection?.optionIds ?? [])
        .map((optionId) => group.options.find((option) => option.id === optionId)?.label)
        .filter((label): label is string => Boolean(label));

      if (labels.length === 0) {
        return null;
      }

      return `${group.label}: ${labels.join(", ")}`;
    })
    .filter((line): line is string => Boolean(line));

  return {
    itemId: item.id,
    itemName: getConfiguredItemName(item, selections),
    quantity: 1,
    basePrice,
    unitPrice,
    totalPrice: unitPrice,
    selections,
    summaryLines,
    quantityEditable: !isWeightBased,
    mergeBehavior: isWeightBased ? "separate" : "merge",
  };
}

export function buildDefaultDraftLineItem(item: MenuItem) {
  return buildDraftLineItem(item, getDefaultModifierSelections(item));
}

export function rebuildDraftLineItem(
  item: MenuItem,
  current: DraftLineItem,
  basePriceOverride?: number,
) {
  const rebuilt = buildDraftLineItem(item, current.selections, basePriceOverride);

  return {
    ...rebuilt,
    quantity: current.quantity,
    totalPrice: rebuilt.unitPrice * current.quantity,
  };
}

function selectionsMatch(left: DraftModifierSelection[], right: DraftModifierSelection[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftSelection, index) => {
    const rightSelection = right[index];

    if (!rightSelection || leftSelection.groupId !== rightSelection.groupId) {
      return false;
    }

    if (leftSelection.optionIds.length !== rightSelection.optionIds.length) {
      return false;
    }

    return leftSelection.optionIds.every((optionId, optionIndex) => optionId === rightSelection.optionIds[optionIndex]);
  });
}

export function mergeDraftLineItem(
  existing: DraftLineItem,
  incoming: DraftLineItem,
): DraftLineItem | null {
  if (
    (existing.mergeBehavior ?? "merge") === "separate" ||
    (incoming.mergeBehavior ?? "merge") === "separate"
  ) {
    return null;
  }

  if (
    existing.itemId !== incoming.itemId ||
    existing.basePrice !== incoming.basePrice ||
    existing.unitPrice !== incoming.unitPrice ||
    !selectionsMatch(existing.selections, incoming.selections)
  ) {
    return null;
  }

  const quantity = existing.quantity + incoming.quantity;

  return {
    ...existing,
    quantity,
    totalPrice: existing.unitPrice * quantity,
  };
}

export function appendDraftLineItem(
  current: DraftLineItem[],
  incoming: DraftLineItem,
) {
  const mergedItems = current.map((item) => mergeDraftLineItem(item, incoming) ?? item);
  const hasMerged = mergedItems.some(
    (item, index) =>
      item !== current[index] ||
      (item.itemId === incoming.itemId && item.quantity !== current[index]?.quantity),
  );

  return hasMerged ? mergedItems : [...current, incoming];
}

export function incrementDraftLineItemQuantity(current: DraftLineItem[], index: number) {
  const lineItem = current[index];

  if (!lineItem || lineItem.quantityEditable === false) {
    return current;
  }

  return current.map((item, itemIndex) =>
    itemIndex === index
      ? {
          ...item,
          quantity: item.quantity + 1,
          totalPrice: item.unitPrice * (item.quantity + 1),
        }
      : item,
  );
}

export function removeDraftLineItem(current: DraftLineItem[], index: number) {
  return current.filter((_, itemIndex) => itemIndex !== index);
}

export function decrementDraftLineItemQuantity(current: DraftLineItem[], index: number) {
  const item = current[index];

  if (!item) {
    return current;
  }

  if (item.quantityEditable === false) {
    return current;
  }

  if (item.quantity <= 1) {
    return removeDraftLineItem(current, index);
  }

  return current.map((entry, itemIndex) =>
    itemIndex === index
      ? {
          ...entry,
          quantity: entry.quantity - 1,
          totalPrice: entry.unitPrice * (entry.quantity - 1),
        }
      : entry,
  );
}

export function replaceDraftLineItemAt(
  current: DraftLineItem[],
  index: number,
  replacement: DraftLineItem,
) {
  if (index < 0 || index >= current.length) {
    return appendDraftLineItem(current, replacement);
  }

  return appendDraftLineItem(removeDraftLineItem(current, index), replacement);
}

export function repriceDraftLineItemAt(
  current: DraftLineItem[],
  index: number,
  item: MenuItem,
  basePriceOverride: number,
) {
  const currentLine = current[index];

  if (!currentLine) {
    return current;
  }

  return replaceDraftLineItemAt(
    current,
    index,
    rebuildDraftLineItem(item, currentLine, basePriceOverride),
  );
}

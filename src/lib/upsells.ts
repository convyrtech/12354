import type { MenuSnapshotItem } from "@/lib/fixtures";

function getUpsellFamilyPriority(families: string[]) {
  if (families.some((family) => ["boiled", "fried", "live"].includes(family))) {
    return ["shrimp", "caviar", "drink", "gift", "crab", "mussels", "dessert"];
  }

  if (families.includes("shrimp")) {
    return ["caviar", "drink", "crab", "gift", "mussels", "boiled", "fried", "dessert"];
  }

  if (families.includes("crab")) {
    return ["caviar", "drink", "gift", "shrimp", "mussels", "boiled", "dessert"];
  }

  if (families.includes("caviar")) {
    return ["drink", "gift", "crab", "shrimp", "mussels", "dessert"];
  }

  return ["shrimp", "crab", "caviar", "drink", "gift", "mussels", "dessert"];
}

export function getUpsellNote(entry: MenuSnapshotItem) {
  switch (entry.item.productFamily) {
    case "shrimp":
      return "Креветки.";
    case "crab":
      return "Камчатский краб.";
    case "caviar":
      return "Икра.";
    case "drink":
      return "Вода и соки.";
    case "gift":
      return "Подарочный набор.";
    case "dessert":
      return "Десерт.";
    case "mussels":
      return "Мидии.";
    default:
      return entry.item.description;
  }
}

export function getContextUpsellItems(input: {
  visibleItems: MenuSnapshotItem[];
  excludedItemIds: string[];
  anchorFamilies: string[];
  limit?: number;
}) {
  const limit = input.limit ?? 3;
  const excludedIds = new Set(input.excludedItemIds);
  const familyPriority = getUpsellFamilyPriority(input.anchorFamilies);

  const sortedCandidates = input.visibleItems
    .filter((entry) => !excludedIds.has(entry.item.id))
    .sort((left, right) => {
      const leftPriority = familyPriority.indexOf(left.item.productFamily);
      const rightPriority = familyPriority.indexOf(right.item.productFamily);
      const normalizedLeft = leftPriority === -1 ? familyPriority.length : leftPriority;
      const normalizedRight = rightPriority === -1 ? familyPriority.length : rightPriority;

      if (normalizedLeft !== normalizedRight) {
        return normalizedLeft - normalizedRight;
      }

      return left.effectiveBasePrice - right.effectiveBasePrice;
    });

  const picks: MenuSnapshotItem[] = [];
  const usedFamilies = new Set<string>();

  for (const candidate of sortedCandidates) {
    if (usedFamilies.has(candidate.item.productFamily)) {
      continue;
    }

    picks.push(candidate);
    usedFamilies.add(candidate.item.productFamily);

    if (picks.length === limit) {
      return picks;
    }
  }

  for (const candidate of sortedCandidates) {
    if (picks.some((entry) => entry.item.id === candidate.item.id)) {
      continue;
    }

    picks.push(candidate);

    if (picks.length === limit) {
      break;
    }
  }

  return picks;
}

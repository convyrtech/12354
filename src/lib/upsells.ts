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
      return "К ракам и крабу часто добавляют креветочную линию с отдельной подачей и соусами.";
    case "crab":
      return "Деликатесная линия для более щедрого заказа и более сильного первого впечатления.";
    case "caviar":
      return "Тихое деликатесное усиление к основному заказу, не перегружая стол.";
    case "drink":
      return "Спокойное сопровождение к теплой подаче и вечернему заказу.";
    case "gift":
      return "Небольшой подарочный или гостевой акцент, если хочется усилить подачу без шума.";
    case "dessert":
      return "Небольшой финал к заказу, если хочется закончить мягко и аккуратно.";
    case "mussels":
      return "Теплая соседняя линия, если хочется добавить еще один морской акцент.";
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

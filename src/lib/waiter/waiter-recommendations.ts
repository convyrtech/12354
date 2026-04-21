import type { MenuItem, MenuSnapshotItem } from "@/lib/fixtures";
import { menuItems } from "@/lib/fixtures";
import type {
  HistoricalOrder,
  RecommendationItem,
  RecommendationReason,
  WaiterContext,
} from "@/lib/waiter/waiter-types";

const REASON_TEXT: Record<RecommendationReason, string> = {
  frequent: "берёте чаще всего",
  companion: "к этому идёт хорошо",
  novelty: "впервые в меню",
  signature: "готовим как визитку",
};

// Anchor → companion preference. Used to find the recommended "goes well
// with" item when the user has boiled раки as their most-frequent anchor.
const COMPANION_PREF: Record<string, string[]> = {
  boiled: ["mussels", "vongole", "shrimp-tails", "caviar"],
  fried: ["mussels", "vongole", "shrimp"],
  live: ["mussels", "vongole"],
  shrimp: ["caviar", "crab"],
  mussels: ["shrimp-tails", "shrimp"],
  vongole: ["shrimp-tails", "shrimp"],
  crab: ["caviar", "shrimp-tails"],
  caviar: ["crab", "shrimp-tails"],
};

function findVisible(
  snapshot: MenuSnapshotItem[],
  predicate: (entry: MenuSnapshotItem) => boolean,
): MenuSnapshotItem | null {
  return snapshot.find(predicate) ?? null;
}

function countFrequencies(history: HistoricalOrder[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const order of history) {
    for (const line of order.items) {
      counts.set(line.itemId, (counts.get(line.itemId) ?? 0) + line.qty);
    }
  }
  return counts;
}

function pickMostFrequent(
  snapshot: MenuSnapshotItem[],
  history: HistoricalOrder[],
): RecommendationItem | null {
  const counts = countFrequencies(history);
  if (counts.size === 0) return null;
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [itemId] of ordered) {
    const entry = findVisible(snapshot, (e) => e.item.id === itemId);
    if (entry) {
      return {
        itemId: entry.item.id,
        reason: "frequent",
        reasonText: REASON_TEXT.frequent,
      };
    }
  }
  return null;
}

function getAnchorFamily(item: MenuItem): string | null {
  if (item.subcategory === "boiled" || item.subcategory === "fried" || item.subcategory === "live") {
    return item.subcategory;
  }
  return item.categorySlug ?? null;
}

function pickCompanion(
  snapshot: MenuSnapshotItem[],
  anchor: MenuSnapshotItem | null,
  excluded: Set<string>,
): RecommendationItem | null {
  if (!anchor) return null;
  const family = getAnchorFamily(anchor.item);
  const preferences = family ? (COMPANION_PREF[family] ?? []) : [];
  for (const slug of preferences) {
    const entry = findVisible(
      snapshot,
      (e) => !excluded.has(e.item.id) && e.item.categorySlug === slug,
    );
    if (entry) {
      return {
        itemId: entry.item.id,
        reason: "companion",
        reasonText: REASON_TEXT.companion,
      };
    }
  }
  return null;
}

function pickNovelty(
  snapshot: MenuSnapshotItem[],
  history: HistoricalOrder[],
  excluded: Set<string>,
): RecommendationItem | null {
  const historyIds = new Set(history.flatMap((o) => o.items.map((i) => i.itemId)));
  const candidates = snapshot.filter(
    (entry) =>
      !excluded.has(entry.item.id) &&
      !historyIds.has(entry.item.id) &&
      entry.item.badge === "new",
  );
  if (candidates.length > 0) {
    return {
      itemId: candidates[0].item.id,
      reason: "novelty",
      reasonText: REASON_TEXT.novelty,
    };
  }
  // Fallback: any un-tried signature item.
  const signature = findVisible(
    snapshot,
    (e) =>
      !excluded.has(e.item.id) &&
      !historyIds.has(e.item.id) &&
      Boolean(e.item.isSignature),
  );
  if (signature) {
    return {
      itemId: signature.item.id,
      reason: "novelty",
      reasonText: REASON_TEXT.novelty,
    };
  }
  return null;
}

function pickSignatureFallback(
  snapshot: MenuSnapshotItem[],
  excluded: Set<string>,
  limit: number,
): RecommendationItem[] {
  return snapshot
    .filter((e) => !excluded.has(e.item.id) && Boolean(e.item.isSignature))
    .slice(0, limit)
    .map((entry) => ({
      itemId: entry.item.id,
      reason: "signature" as const,
      reasonText: REASON_TEXT.signature,
    }));
}

export function pickRecommendations(
  context: WaiterContext,
  snapshot: MenuSnapshotItem[],
  count: number = 3,
): RecommendationItem[] {
  const history = context.user?.history ?? [];
  const picks: RecommendationItem[] = [];
  const taken = new Set<string>();

  if (history.length > 0) {
    const frequent = pickMostFrequent(snapshot, history);
    if (frequent) {
      picks.push(frequent);
      taken.add(frequent.itemId);
    }

    const anchor =
      findVisible(snapshot, (e) => e.item.id === picks[0]?.itemId) ?? null;
    const companion = pickCompanion(snapshot, anchor, taken);
    if (companion) {
      picks.push(companion);
      taken.add(companion.itemId);
    }

    const novelty = pickNovelty(snapshot, history, taken);
    if (novelty) {
      picks.push(novelty);
      taken.add(novelty.itemId);
    }
  }

  if (picks.length < count) {
    const fallback = pickSignatureFallback(snapshot, taken, count - picks.length);
    picks.push(...fallback);
  }

  return picks.slice(0, count);
}

// Helper used by tests that don't wire a full snapshot — assumes every item
// in fixtures is visible.
export function allMenuItemsAsSnapshot(): MenuSnapshotItem[] {
  return menuItems.map(
    (item): MenuSnapshotItem => ({
      item,
      state: "available",
      reason: "",
      effectiveBasePrice: item.basePrice,
      priceDelta: 0,
    }),
  );
}

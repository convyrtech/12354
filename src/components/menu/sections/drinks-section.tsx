"use client";

import type { MenuSnapshotItem } from "@/lib/fixtures";
import { SectionShell } from "@/components/menu/shared/section-shell";
import { CompactCard } from "@/components/menu/cards/compact-card";

type Props = {
  entries: MenuSnapshotItem[];
  onAdd?: (entry: MenuSnapshotItem) => void;
};

type DrinksSub = { title: string; items: MenuSnapshotItem[] };

function bucketBySubcategory(entries: MenuSnapshotItem[]): DrinksSub[] {
  const groups: DrinksSub[] = [
    { title: "Напитки.", items: [] },
    { title: "Пиво.", items: [] },
    { title: "Вино.", items: [] },
  ];
  for (const entry of entries) {
    const idx =
      entry.item.subcategory === "beer" ? 1 : entry.item.subcategory === "wine" ? 2 : 0;
    groups[idx].items.push(entry);
  }
  return groups;
}

// Beer and wine slots stay architecturally ready so fixtures can add items
// without structural changes in Phase 3.
export function DrinksSection({ entries, onAdd }: Props) {
  if (entries.length === 0) return null;
  const [main, ...subGroups] = bucketBySubcategory(entries);
  if (main.items.length === 0 && subGroups.every((g) => g.items.length === 0)) return null;

  return (
    <SectionShell id="drinks" title={main.title}>
      {main.items.length > 0 ? (
        <div className="menu-section__grid-2">
          {main.items.map((entry) => (
            <CompactCard key={entry.item.id} entry={entry} variant="small" onAdd={onAdd} />
          ))}
        </div>
      ) : null}

      {subGroups
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <div key={group.title} style={{ marginTop: 48 }}>
            <h3 className="menu-section__subheadline">{group.title}</h3>
            <div className="menu-section__grid-2">
              {group.items.map((entry) => (
                <CompactCard key={entry.item.id} entry={entry} variant="small" onAdd={onAdd} />
              ))}
            </div>
          </div>
        ))}
    </SectionShell>
  );
}

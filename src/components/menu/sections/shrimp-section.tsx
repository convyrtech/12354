"use client";

import type { MenuSnapshotItem } from "@/lib/fixtures";
import { SectionShell } from "@/components/menu/shared/section-shell";
import { CompactCard } from "@/components/menu/cards/compact-card";

type Props = {
  entries: MenuSnapshotItem[];
};

type Group = { title: string; items: MenuSnapshotItem[] };

function bucketByPreparation(entries: MenuSnapshotItem[]): Group[] {
  const groups: Group[] = [
    { title: "Отварные.", items: [] },
    { title: "На льду.", items: [] },
    { title: "Обжаренные.", items: [] },
  ];
  for (const entry of entries) {
    const idx =
      entry.item.subcategory === "on-ice"
        ? 1
        : entry.item.subcategory === "fried"
          ? 2
          : 0;
    groups[idx].items.push(entry);
  }
  return groups.filter((group) => group.items.length > 0);
}

export function ShrimpSection({ entries }: Props) {
  if (entries.length === 0) return null;
  const groups = bucketByPreparation(entries);

  return (
    <SectionShell
      id="shrimp"
      title="Креветки."
      eyebrow="дикие, Магадан"
      narrative="Дикие, не фермерские. Из открытого Охотского моря."
    >
      {groups.map((group, idx) => {
        const hasSubheading = groups.length > 1;
        return (
          <div key={group.title} style={{ marginTop: idx === 0 ? 0 : 48 }}>
            {hasSubheading ? (
              <h3 className="menu-section__subheadline">{group.title}</h3>
            ) : null}
            <div className="menu-section__grid-3">
              {group.items.map((entry) => (
                <CompactCard
                  key={entry.item.id}
                  entry={entry}
                  variant="shrimp"
                  titleLevel={hasSubheading ? "h4" : "h3"}
                />
              ))}
            </div>
          </div>
        );
      })}
    </SectionShell>
  );
}

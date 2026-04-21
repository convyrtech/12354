"use client";

import type { MenuSnapshotItem } from "@/lib/fixtures";
import { SectionShell } from "@/components/menu/shared/section-shell";
import { CaviarCard } from "@/components/menu/cards/caviar-card";

type Props = {
  entries: MenuSnapshotItem[];
};

export function CaviarSection({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <SectionShell id="caviar" title="Икра." eyebrow="горбуша и осётр">
      <div className="menu-section__grid-2">
        {entries.map((entry) => (
          <CaviarCard key={entry.item.id} entry={entry} />
        ))}
      </div>
    </SectionShell>
  );
}

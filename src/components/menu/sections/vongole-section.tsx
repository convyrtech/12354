"use client";

import type { MenuSnapshotItem } from "@/lib/fixtures";
import { SectionShell } from "@/components/menu/shared/section-shell";
import { CompactCard } from "@/components/menu/cards/compact-card";

type Props = {
  entries: MenuSnapshotItem[];
  onAdd?: (entry: MenuSnapshotItem) => void;
};

export function VongoleSection({ entries, onAdd }: Props) {
  if (entries.length === 0) return null;

  return (
    <SectionShell id="vongole" title="Вонголе." eyebrow="три соуса">
      <div className="menu-section__grid-3">
        {entries.map((entry) => (
          <CompactCard
            key={entry.item.id}
            entry={entry}
            variant="mussel"
            onAdd={onAdd}
          />
        ))}
      </div>
    </SectionShell>
  );
}

"use client";

import type { MenuSnapshotItem } from "@/lib/fixtures";
import { SectionShell } from "@/components/menu/shared/section-shell";
import { GiftCard } from "@/components/menu/cards/gift-card";

type Props = {
  entries: MenuSnapshotItem[];
};

export function GiftsSection({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <SectionShell id="gifts" title="Набором." eyebrow="подарочные">
      <div className="menu-section__grid-2">
        {entries.map((entry) => (
          <GiftCard key={entry.item.id} entry={entry} />
        ))}
      </div>
    </SectionShell>
  );
}

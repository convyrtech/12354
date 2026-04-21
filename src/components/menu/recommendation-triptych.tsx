"use client";

import type { MenuSnapshotItem } from "@/lib/fixtures";
import type { RecommendationItem } from "@/lib/waiter/waiter-types";
import { MenuCardEditorial } from "@/components/menu/cards/menu-card-editorial";
import { EditorialLabel } from "@/components/menu/shared/editorial-label";

type Props = {
  items: RecommendationItem[];
  lookup: (itemId: string) => MenuSnapshotItem | null;
  eyebrow?: string;
  title?: string;
};

export function RecommendationTriptych({
  items,
  lookup,
  eyebrow = "рекомендация кухни",
  title = "Для вашего стола.",
}: Props) {
  const resolved = items
    .map((rec) => ({ rec, entry: lookup(rec.itemId) }))
    .filter(
      (pair): pair is { rec: RecommendationItem; entry: MenuSnapshotItem } =>
        pair.entry != null,
    );

  if (resolved.length === 0) return null;

  return (
    <section
      id="triptych"
      className="menu-section menu-triptych"
      aria-labelledby="triptych-heading"
    >
      <EditorialLabel>{eyebrow}</EditorialLabel>
      <h2 id="triptych-heading" className="menu-section__headline">
        {title}
      </h2>

      <div className="menu-triptych__grid">
        {resolved.map(({ rec, entry }, index) => (
          <MenuCardEditorial
            key={rec.itemId}
            entry={entry}
            reasonText={rec.reasonText}
            priority={index === 0}
          />
        ))}
      </div>
    </section>
  );
}

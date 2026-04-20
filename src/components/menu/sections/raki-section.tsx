"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { MenuSnapshotItem } from "@/lib/fixtures";
import { getMenuImage } from "@/lib/category-images";
import { SectionShell } from "@/components/menu/shared/section-shell";
import { TabsEditorial, type TabOption } from "@/components/menu/shared/tabs-editorial";
import { SizeRow, type MenuTier, type SizeRowData } from "@/components/menu/cards/size-row";

const TABS: readonly TabOption<"boiled" | "live" | "fried">[] = [
  { id: "boiled", label: "варёные" },
  { id: "live", label: "живые" },
  { id: "fried", label: "жареные" },
];

// All three раки modifier groups order options S → M → L → XL → XXL, so
// positional mapping beats a hand-maintained tier→id table. If fixtures
// ever deviate, buildSizeRows yields fewer than 5 rows instead of crashing.
const SIZE_ORDER: MenuTier[] = ["S", "M", "L", "XL", "XXL"];

type Props = {
  boiled?: MenuSnapshotItem;
  live?: MenuSnapshotItem;
  fried?: MenuSnapshotItem;
};

function findSizeGroup(entry: MenuSnapshotItem) {
  return entry.item.modifierGroups.find((g) => g.id.endsWith("_size_tier"));
}

function buildSizeRows(entry: MenuSnapshotItem | undefined): SizeRowData[] {
  if (!entry) return [];
  const group = findSizeGroup(entry);
  if (!group) return [];
  return group.options.slice(0, SIZE_ORDER.length).map((option, index) => ({
    tier: SIZE_ORDER[index],
    pricePerKg: entry.effectiveBasePrice + option.priceDelta,
    state: entry.state === "sold_out" ? "sold_out" : "available",
  }));
}

export function RakiSection({ boiled, live, fried }: Props) {
  const [tab, setTab] = useState<"boiled" | "live" | "fried">("boiled");

  const byTab = { boiled, live, fried } as const;
  const activeEntry = byTab[tab];
  const rows = useMemo(() => buildSizeRows(activeEntry), [activeEntry]);
  const photo = activeEntry
    ? getMenuImage(activeEntry.item.imageKey, activeEntry.item.name)
    : null;

  if (!activeEntry) return null;

  return (
    <SectionShell id="raki" title="Раки." eyebrow="живые из Дона, с 2017">
      <div className="menu-section__split-60-40">
        <div>
          <div style={{ marginBottom: 24 }}>
            <TabsEditorial
              options={TABS}
              value={tab}
              onChange={setTab}
              ariaLabel="Вид приготовления раков"
            />
          </div>

          <table className="menu-size-table">
            <tbody>
              {rows.map((row) => (
                <SizeRow key={row.tier} row={row} />
              ))}
            </tbody>
          </table>
        </div>

        {photo ? (
          <div className="menu-photo-frame menu-photo-frame--xl">
            <Image
              src={photo.src}
              width={photo.width}
              height={photo.height}
              alt={photo.alt}
              sizes="(max-width: 1023px) 92vw, 520px"
              priority
              style={{ width: "100%", height: "auto", aspectRatio: "4 / 5", objectFit: "cover" }}
            />
            {activeEntry.item.editorialNote ? (
              <p className="menu-section__narrative" style={{ marginTop: 16 }}>
                {activeEntry.item.editorialNote}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}

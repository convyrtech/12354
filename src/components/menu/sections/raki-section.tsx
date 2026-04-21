"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { MenuSnapshotItem } from "@/lib/fixtures";
import { formatMoney } from "@/lib/fixtures";
import { getMenuImage } from "@/lib/category-images";
import { SectionShell } from "@/components/menu/shared/section-shell";
import {
  TabsEditorial,
  type TabOption,
} from "@/components/menu/shared/tabs-editorial";
import { RecipeChips } from "@/components/menu/shared/recipe-chips";
import {
  SizeRow,
  type MenuTier,
  type SizeRowData,
} from "@/components/menu/cards/size-row";
import {
  getDefaultRecipeOptionId,
  getRecipeGroup,
  getSizeGroup,
  getWeightGroup,
  type RakiSubcategory,
} from "@/lib/menu/recipes";
import { useAddToCart } from "@/components/menu/use-add-to-cart";

const TABS: readonly TabOption<RakiSubcategory>[] = [
  { id: "boiled", label: "варёные" },
  { id: "live", label: "живые" },
  { id: "fried", label: "жареные" },
];

const SIZE_ORDER: MenuTier[] = ["S", "M", "L", "XL", "XXL"];

const RECIPE_LABEL: Record<RakiSubcategory, string> = {
  boiled: "Рецепт варки",
  live: "Рецепт",
  fried: "Рецепт обжарки",
};

type Props = {
  boiled?: MenuSnapshotItem;
  live?: MenuSnapshotItem;
  fried?: MenuSnapshotItem;
};

function buildSizeRows(
  entry: MenuSnapshotItem | undefined,
  subcategory: RakiSubcategory,
  recipeDelta: number,
): SizeRowData[] {
  if (!entry) return [];
  const group = getSizeGroup(entry.item, subcategory);
  if (!group) return [];
  return group.options.slice(0, SIZE_ORDER.length).map((option, index) => ({
    tier: SIZE_ORDER[index],
    pricePerKg: entry.effectiveBasePrice + option.priceDelta + recipeDelta,
    state: entry.state === "sold_out" ? "sold_out" : "available",
  }));
}

function initialRecipeDefault(
  entry: MenuSnapshotItem | undefined,
  subcategory: RakiSubcategory,
): string {
  if (!entry) return "";
  const group = getRecipeGroup(entry.item, subcategory);
  return group ? getDefaultRecipeOptionId(group) : "";
}

export function RakiSection({ boiled, live, fried }: Props) {
  const [tab, setTab] = useState<RakiSubcategory>("boiled");
  const byTab = { boiled, live, fried } as const;
  const activeEntry = byTab[tab];
  const { addItemWithSelections } = useAddToCart();

  const recipeGroup = activeEntry
    ? getRecipeGroup(activeEntry.item, tab)
    : null;

  // Initialise with each subcategory's default on first render so SSR
  // emits the recipe chips + current-selection strip already populated.
  const [selectedRecipeByTab, setSelectedRecipeByTab] = useState<
    Record<RakiSubcategory, string>
  >(() => ({
    boiled: initialRecipeDefault(boiled, "boiled"),
    live: initialRecipeDefault(live, "live"),
    fried: initialRecipeDefault(fried, "fried"),
  }));

  // If fixtures drift mid-session (e.g. option removed), fall back to the
  // current group's first option the next time the tab is visited.
  useEffect(() => {
    if (!recipeGroup) return;
    setSelectedRecipeByTab((prev) => {
      const current = prev[tab];
      const valid =
        current && recipeGroup.options.some((o) => o.id === current);
      if (valid) return prev;
      return { ...prev, [tab]: getDefaultRecipeOptionId(recipeGroup) };
    });
  }, [recipeGroup, tab]);

  const selectedRecipeId = selectedRecipeByTab[tab];
  const selectedRecipeOption =
    recipeGroup && selectedRecipeId
      ? recipeGroup.options.find((o) => o.id === selectedRecipeId) ?? null
      : null;
  const recipeDelta = selectedRecipeOption?.priceDelta ?? 0;

  const rows = buildSizeRows(activeEntry, tab, recipeDelta);

  const handleTierAdd = useCallback(
    (tier: MenuTier) => {
      if (!activeEntry || activeEntry.state === "sold_out") return;
      const sizeGroup = getSizeGroup(activeEntry.item, tab);
      const weightGroup = getWeightGroup(activeEntry.item, tab);
      const recipeGroupLocal = getRecipeGroup(activeEntry.item, tab);
      if (!sizeGroup) return;
      const tierIndex = SIZE_ORDER.indexOf(tier);
      const sizeOption = sizeGroup.options[tierIndex];
      if (!sizeOption) return;
      addItemWithSelections(
        activeEntry.item,
        [
          { groupId: sizeGroup.id, optionIds: [sizeOption.id] },
          ...(recipeGroupLocal && selectedRecipeId
            ? [
                {
                  groupId: recipeGroupLocal.id,
                  optionIds: [selectedRecipeId],
                },
              ]
            : []),
          ...(weightGroup
            ? [
                {
                  groupId: weightGroup.id,
                  optionIds: [weightGroup.options[0]?.id ?? ""].filter(Boolean),
                },
              ]
            : []),
        ],
        activeEntry.effectiveBasePrice,
      );
    },
    [activeEntry, tab, selectedRecipeId, addItemWithSelections],
  );

  const photo = activeEntry
    ? getMenuImage(activeEntry.item.imageKey, activeEntry.item.name)
    : null;

  if (!activeEntry) return null;

  return (
    <SectionShell id="raki" title="Раки." eyebrow="живые из Дона, с 2017">
      <div className="menu-section__split-60-40">
        <div>
          <div style={{ marginBottom: 20 }}>
            <TabsEditorial
              options={TABS}
              value={tab}
              onChange={setTab}
              ariaLabel="Вид приготовления раков"
            />
          </div>

          {recipeGroup && selectedRecipeId ? (
            <div style={{ marginBottom: 24 }}>
              <RecipeChips
                options={recipeGroup.options}
                value={selectedRecipeId}
                onChange={(id) =>
                  setSelectedRecipeByTab((prev) => ({ ...prev, [tab]: id }))
                }
                ariaLabel={RECIPE_LABEL[tab]}
              />
              {selectedRecipeOption ? (
                <div className="menu-recipe-current" aria-live="polite">
                  <span className="menu-recipe-current__label">
                    {RECIPE_LABEL[tab]}
                  </span>
                  <span className="menu-recipe-current__value">
                    {selectedRecipeOption.label}
                  </span>
                  <span className="menu-recipe-current__delta">
                    {recipeDelta > 0
                      ? `+${formatMoney(recipeDelta)} / кг`
                      : "в базовой цене"}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          <table
            className="menu-size-table"
            data-recipe={selectedRecipeId || "none"}
            data-recipe-delta={recipeDelta}
          >
            <tbody>
              {rows.map((row) => (
                <SizeRow
                  key={`${tab}-${selectedRecipeId}-${row.tier}`}
                  row={row}
                  onAdd={handleTierAdd}
                />
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
              style={{
                width: "100%",
                height: "auto",
                aspectRatio: "4 / 5",
                objectFit: "cover",
              }}
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

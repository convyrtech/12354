"use client";

import { useMemo } from "react";
import { useCity } from "@/lib/cities/city-context";
import { useDraft } from "@/components/draft-provider";
import type { FulfillmentMode } from "@/lib/fixtures";
import {
  getCategoryItems,
  getMenuForCity,
} from "@/lib/menu/menu-queries";
import { MenuHero } from "@/components/menu/menu-hero";
import {
  CategoryChips,
  type CategoryChip,
} from "@/components/menu/category-chips";
import { RakiSection } from "@/components/menu/sections/raki-section";
import { ShrimpTailsSection } from "@/components/menu/sections/shrimp-tails-section";
import { MusselsSection } from "@/components/menu/sections/mussels-section";
import { VongoleSection } from "@/components/menu/sections/vongole-section";
import { CrabSection } from "@/components/menu/sections/crab-section";
import { ShrimpSection } from "@/components/menu/sections/shrimp-section";
import { CaviarSection } from "@/components/menu/sections/caviar-section";
import { DessertsSection } from "@/components/menu/sections/desserts-section";
import { DrinksSection } from "@/components/menu/sections/drinks-section";
import { GiftsSection } from "@/components/menu/sections/gifts-section";
import { CtaFooterMenu } from "@/components/menu/cta-footer-menu";

export function MenuPage() {
  const { cityId } = useCity();
  const { draft } = useDraft();

  const fulfillmentMode: FulfillmentMode = draft.fulfillmentMode ?? "delivery";

  const snapshot = useMemo(
    () => getMenuForCity(cityId, fulfillmentMode),
    [cityId, fulfillmentMode],
  );

  const byCategory = useMemo(() => {
    const raki = getCategoryItems(snapshot, "raki");
    return {
      rakiBoiled: raki.find((entry) => entry.item.subcategory === "boiled"),
      rakiLive: raki.find((entry) => entry.item.subcategory === "live"),
      rakiFried: raki.find((entry) => entry.item.subcategory === "fried"),
      shrimpTails: getCategoryItems(snapshot, "shrimp-tails")[0],
      mussels: getCategoryItems(snapshot, "mussels"),
      vongole: getCategoryItems(snapshot, "vongole"),
      crab: getCategoryItems(snapshot, "crab"),
      shrimp: getCategoryItems(snapshot, "shrimp"),
      caviar: getCategoryItems(snapshot, "caviar"),
      desserts: getCategoryItems(snapshot, "desserts"),
      drinks: getCategoryItems(snapshot, "drinks"),
      gifts: getCategoryItems(snapshot, "gifts"),
    };
  }, [snapshot]);

  const chips = useMemo<CategoryChip[]>(() => {
    const list: CategoryChip[] = [];
    if (byCategory.rakiBoiled || byCategory.rakiLive || byCategory.rakiFried)
      list.push({ id: "raki", label: "Раки", anchor: "raki" });
    if (byCategory.shrimpTails)
      list.push({ id: "shrimp-tails", label: "Шейки", anchor: "shrimp-tails" });
    if (byCategory.mussels.length > 0)
      list.push({ id: "mussels", label: "Мидии", anchor: "mussels" });
    if (byCategory.vongole.length > 0)
      list.push({ id: "vongole", label: "Вонголе", anchor: "vongole" });
    if (byCategory.crab.length > 0)
      list.push({ id: "crab", label: "Краб", anchor: "crab" });
    if (byCategory.shrimp.length > 0)
      list.push({ id: "shrimp", label: "Креветки", anchor: "shrimp" });
    if (byCategory.caviar.length > 0)
      list.push({ id: "caviar", label: "Икра", anchor: "caviar" });
    if (byCategory.desserts.length > 0)
      list.push({ id: "desserts", label: "Десерты", anchor: "desserts" });
    if (byCategory.drinks.length > 0)
      list.push({ id: "drinks", label: "Напитки", anchor: "drinks" });
    if (byCategory.gifts.length > 0)
      list.push({ id: "gifts", label: "Подарки", anchor: "gifts" });
    return list;
  }, [byCategory]);

  return (
    <div className="menu-shell">
      <MenuHero />
      <div className="menu-catalog">
        <CategoryChips chips={chips} />
        <RakiSection
          boiled={byCategory.rakiBoiled}
          live={byCategory.rakiLive}
          fried={byCategory.rakiFried}
        />
        {byCategory.shrimpTails ? (
          <ShrimpTailsSection entry={byCategory.shrimpTails} />
        ) : null}
        <MusselsSection entries={byCategory.mussels} />
        <VongoleSection entries={byCategory.vongole} />
        <CrabSection entries={byCategory.crab} />
        <ShrimpSection entries={byCategory.shrimp} />
        <CaviarSection entries={byCategory.caviar} />
        <DessertsSection entries={byCategory.desserts} />
        <DrinksSection entries={byCategory.drinks} />
        <GiftsSection entries={byCategory.gifts} />
        <CtaFooterMenu />
      </div>
    </div>
  );
}

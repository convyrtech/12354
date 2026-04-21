"use client";

import Image from "next/image";
import type { MenuSnapshotItem } from "@/lib/fixtures";
import { formatMoney } from "@/lib/fixtures";
import { getMenuImage } from "@/lib/category-images";
import { AddToCartLink } from "@/components/menu/shared/add-to-cart-link";
import { SectionShell } from "@/components/menu/shared/section-shell";
import { StopListNote } from "@/components/menu/shared/stop-list-note";
import { useAddToCart } from "@/components/menu/use-add-to-cart";

type Props = {
  entry: MenuSnapshotItem;
};

export function ShrimpTailsSection({ entry }: Props) {
  const { addEntry } = useAddToCart();
  const image = getMenuImage(entry.item.imageKey, entry.item.name);
  const isStopList = entry.state === "sold_out";

  return (
    <SectionShell id="shrimp-tails" title="Раковые шейки." eyebrow="премиум, 100 г">
      <div className="menu-section__split-60-40">
        <div>
          <p className="menu-section__narrative">
            {entry.item.editorialNote ?? entry.item.description}
          </p>
          <div className="menu-card-footer-row" style={{ marginTop: 24, gap: 24 }}>
            <span className="menu-card-luxury__price">
              {formatMoney(entry.effectiveBasePrice)}{" "}
              <span className="menu-size-row__unit">/ 100 г</span>
            </span>
            {isStopList ? (
              <StopListNote />
            ) : (
              <AddToCartLink onClick={() => addEntry(entry)}>
                в корзину
              </AddToCartLink>
            )}
          </div>
        </div>
        <div className="menu-photo-frame menu-photo-frame--xl">
          <Image
            src={image.src}
            width={image.width}
            height={image.height}
            alt={image.alt}
            sizes="(max-width: 1023px) 92vw, 420px"
            style={{ width: "100%", height: "auto", aspectRatio: "4 / 3", objectFit: "cover" }}
          />
        </div>
      </div>
    </SectionShell>
  );
}

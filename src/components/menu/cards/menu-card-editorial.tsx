"use client";

import Image from "next/image";
import Link from "next/link";
import type { MenuSnapshotItem } from "@/lib/fixtures";
import { formatMoney } from "@/lib/fixtures";
import { getMenuImage } from "@/lib/category-images";
import { AddToCartLink } from "@/components/menu/shared/add-to-cart-link";
import { StopListNote } from "@/components/menu/shared/stop-list-note";

type Props = {
  entry: MenuSnapshotItem;
  reasonText: string;
  priority?: boolean;
  onAdd?: (entry: MenuSnapshotItem) => void;
};

export function MenuCardEditorial({ entry, reasonText, priority, onAdd }: Props) {
  const isStopList = entry.state === "sold_out";
  const image = getMenuImage(entry.item.imageKey, entry.item.name);

  return (
    <article
      className="menu-card-editorial"
      data-stop-list={isStopList || undefined}
    >
      <div className="menu-card-editorial__reason">—— {reasonText}</div>
      <Link href={`/product/${entry.item.id}`} className="menu-photo-frame">
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt={image.alt}
          sizes="(max-width: 1023px) 92vw, 420px"
          priority={priority}
          style={{ width: "100%", height: "auto", aspectRatio: "4 / 3", objectFit: "cover" }}
        />
      </Link>
      <div>
        <h3 className="menu-card-editorial__title">{entry.item.name}</h3>
        <div className="menu-card-compact__price" style={{ marginTop: 6 }}>
          {formatMoney(entry.effectiveBasePrice)}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {isStopList ? (
          <StopListNote />
        ) : (
          <AddToCartLink onClick={() => onAdd?.(entry)} disabled={!onAdd}>
            в корзину
          </AddToCartLink>
        )}
      </div>
    </article>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import type { MenuSnapshotItem } from "@/lib/fixtures";
import { formatMoney } from "@/lib/fixtures";
import { getMenuImage } from "@/lib/category-images";
import { AddToCartLink } from "@/components/menu/shared/add-to-cart-link";
import { StopListNote } from "@/components/menu/shared/stop-list-note";
import { useAddToCart } from "@/components/menu/use-add-to-cart";

type Props = {
  entry: MenuSnapshotItem;
};

export function CaviarCard({ entry }: Props) {
  const { addEntry } = useAddToCart();
  const isStopList = entry.state === "sold_out";
  const image = getMenuImage(entry.item.imageKey, entry.item.name);

  return (
    <article
      className="menu-card-luxury"
      data-stop-list={isStopList || undefined}
    >
      <Link href={`/product/${entry.item.id}`} className="menu-photo-frame">
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt={image.alt}
          sizes="(max-width: 1023px) 92vw, 640px"
          style={{
            width: "100%",
            height: "auto",
            aspectRatio: "4 / 5",
            objectFit: "cover",
          }}
        />
      </Link>
      <div>
        <h3 className="menu-card-luxury__title">{entry.item.name}</h3>
        {entry.item.editorialNote ? (
          <p className="menu-section__narrative" style={{ marginTop: 10 }}>
            {entry.item.editorialNote}
          </p>
        ) : null}
      </div>
      <div className="menu-card-footer-row menu-card-footer-row--bordered">
        <span className="menu-card-luxury__price">
          {formatMoney(entry.effectiveBasePrice)}
        </span>
        {isStopList ? (
          <StopListNote />
        ) : (
          <AddToCartLink onClick={() => addEntry(entry)}>
            в корзину
          </AddToCartLink>
        )}
      </div>
    </article>
  );
}

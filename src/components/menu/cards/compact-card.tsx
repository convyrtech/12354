"use client";

import Image from "next/image";
import Link from "next/link";
import type { MenuSnapshotItem } from "@/lib/fixtures";
import { formatMoney } from "@/lib/fixtures";
import { getMenuImage } from "@/lib/category-images";
import { AddToCartLink } from "@/components/menu/shared/add-to-cart-link";
import { NewTag } from "@/components/menu/shared/new-tag";
import { StopListNote } from "@/components/menu/shared/stop-list-note";
import { useAddToCart } from "@/components/menu/use-add-to-cart";

type Variant = "mussel" | "shrimp" | "small";

type Props = {
  entry: MenuSnapshotItem;
  variant?: Variant;
};

function formatMetadata(entry: MenuSnapshotItem): string {
  const meta = entry.item.metadata;
  if (!meta) return "";
  const parts: string[] = [];
  if (meta.weight) {
    parts.push(
      meta.weight.unit === "kg"
        ? `${meta.weight.value} кг`
        : `${meta.weight.value} г`,
    );
  }
  if (meta.origin) parts.push(meta.origin);
  if (meta.serving) parts.push(meta.serving);
  return parts.join(" · ");
}

export function CompactCard({ entry, variant = "mussel" }: Props) {
  const { addEntry } = useAddToCart();
  const isStopList = entry.state === "sold_out";
  const image = getMenuImage(entry.item.imageKey, entry.item.name);
  const meta = formatMetadata(entry);

  return (
    <article
      className="menu-card-compact"
      data-variant={variant}
      data-stop-list={isStopList || undefined}
    >
      <Link
        href={`/product/${entry.item.id}`}
        className="menu-card-compact__photo"
        aria-label={`Открыть ${entry.item.name}`}
      >
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt={image.alt}
          sizes="(max-width: 1023px) 40vw, 148px"
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      </Link>
      <div className="menu-card-compact__body">
        <div>
          <h3 className="menu-card-compact__title">
            {entry.item.name}
            {entry.item.badge ? (
              <>
                {" "}
                <NewTag badge={entry.item.badge} />
              </>
            ) : null}
          </h3>
          {meta ? <div className="menu-card-compact__meta">{meta}</div> : null}
        </div>
        <div className="menu-card-compact__price">
          {formatMoney(entry.effectiveBasePrice)}
        </div>
        <div className="menu-card-compact__cta-row">
          {isStopList ? (
            <StopListNote />
          ) : (
            <AddToCartLink onClick={() => addEntry(entry)}>
              в корзину
            </AddToCartLink>
          )}
        </div>
      </div>
    </article>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import type { MenuSnapshotItem } from "@/lib/fixtures";
import { formatMoney } from "@/lib/fixtures";
import { getMenuImage } from "@/lib/category-images";
import { AddToCartLink } from "@/components/menu/shared/add-to-cart-link";
import { NewTag } from "@/components/menu/shared/new-tag";
import { SectionShell } from "@/components/menu/shared/section-shell";
import { StopListNote } from "@/components/menu/shared/stop-list-note";

type Props = {
  entries: MenuSnapshotItem[];
  onAdd?: (entry: MenuSnapshotItem) => void;
};

export function CrabSection({ entries, onAdd }: Props) {
  if (entries.length === 0) return null;

  const lead = entries[0];
  const image = getMenuImage(lead.item.imageKey, lead.item.name);
  const narrative =
    lead.item.editorialNote ??
    "Фаланга L5 и краб целиком — две якорные позиции. Мяса до 90 процентов, заготовка на корабле.";

  return (
    <SectionShell id="crab" title="Камчатский краб." eyebrow="живым с корабля в Охотском">
      <div className="menu-section__split-60-40">
        <div>
          <p className="menu-section__narrative">{narrative}</p>
          <table className="menu-size-table" style={{ marginTop: 24 }}>
            <tbody>
              {entries.map((entry) => {
                const isStopList = entry.state === "sold_out";
                return (
                  <tr key={entry.item.id} className="menu-size-row" data-stop-list={isStopList || undefined}>
                    <td className="menu-size-row__cell">
                      <Link
                        href={`/product/${entry.item.id}`}
                        className="menu-card-compact__title"
                        style={{ textDecoration: "none" }}
                      >
                        {entry.item.name}
                      </Link>
                      {entry.item.badge ? (
                        <>
                          {" "}
                          <NewTag badge={entry.item.badge} />
                        </>
                      ) : null}
                    </td>
                    <td className="menu-size-row__cell menu-size-row__price">
                      {formatMoney(entry.effectiveBasePrice)}
                    </td>
                    <td className="menu-size-row__cell" style={{ textAlign: "right" }}>
                      {isStopList ? (
                        <StopListNote />
                      ) : (
                        <AddToCartLink onClick={() => onAdd?.(entry)} disabled={!onAdd}>
                          в корзину
                        </AddToCartLink>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="menu-photo-frame menu-photo-frame--xl">
          <Image
            src={image.src}
            width={image.width}
            height={image.height}
            alt={image.alt}
            sizes="(max-width: 1023px) 92vw, 420px"
            style={{ width: "100%", height: "auto", aspectRatio: "4 / 5", objectFit: "cover" }}
          />
        </div>
      </div>
    </SectionShell>
  );
}

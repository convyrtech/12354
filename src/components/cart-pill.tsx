"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDraft } from "@/components/draft-provider";
import { CART_OPEN_EVENT } from "@/components/cart-events";
import { getProductFamilyImage } from "@/lib/category-images";
import { getDraftCartView, hasResolvedServiceContext } from "@/lib/draft-view";
import { formatMoney, getMenuSnapshotForContext } from "@/lib/fixtures";
import {
  appendDraftLineItem,
  buildDefaultDraftLineItem,
  decrementDraftLineItemQuantity,
  incrementDraftLineItemQuantity,
  removeDraftLineItem,
  type DraftLineItem,
} from "@/lib/line-item";
import { getContextUpsellItems, getUpsellNote } from "@/lib/upsells";

type ModifierRow = {
  label: string;
  value: string;
};

const SUMMARY_LABEL_MAP: Record<string, string> = {
  "Рецепт варки": "Рецепт",
  "Рецепт обжарки": "Рецепт",
  "Рецепт жарки": "Рецепт",
  "Степень соли": "Соль",
  "Степень остроты": "Острота",
  "Базовый соус": "Соус",
  "Соусы к подаче": "Соусы",
  Добрать: "Вес",
};

function parseSummaryLine(line: string): ModifierRow | null {
  const separatorIndex = line.indexOf(":");

  if (separatorIndex === -1) {
    const trimmed = line.trim();
    return trimmed ? { label: "Параметр", value: trimmed } : null;
  }

  const rawLabel = line.slice(0, separatorIndex).trim();
  const value = line.slice(separatorIndex + 1).trim();

  if (!value) return null;

  return {
    label: SUMMARY_LABEL_MAP[rawLabel] ?? rawLabel,
    value,
  };
}

function getContextHref(fulfillmentMode: string | null) {
  return fulfillmentMode === "pickup" ? "/pickup/points" : "/delivery/address";
}

function getServiceEyebrow(fulfillmentMode: string | null) {
  return fulfillmentMode === "pickup" ? "Самовывоз" : "Доставка";
}

function getIssueLabel(count: number) {
  if (count <= 0) return null;

  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `Проверьте ${count} позицию`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `Проверьте ${count} позиции`;
  }

  return `Проверьте ${count} позиций`;
}

function getServiceMeta(input: {
  fulfillmentMode: string | null;
  serviceResolved: boolean;
  serviceLabel: string | null;
  etaLabel: string | null;
  issueCount: number;
}) {
  const issueLabel = getIssueLabel(input.issueCount);
  if (issueLabel) return issueLabel;

  if (!input.serviceResolved) {
    return null;
  }

  return [input.serviceLabel, input.etaLabel].filter(Boolean).join(" · ");
}

function scrollToEditorialCatalog() {
  if (typeof document === "undefined") return;
  const node = document.getElementById("editorial-catalog");
  if (!node) return;

  const y = node.getBoundingClientRect().top + window.scrollY - 36;
  window.scrollTo({ top: y, behavior: "smooth" });
}

function getLineProductImage(
  lineItem: DraftLineItem,
  visibleItems: ReturnType<typeof getMenuSnapshotForContext>["visibleItems"],
) {
  const family =
    visibleItems.find((entry) => entry.item.id === lineItem.itemId)?.item.productFamily ?? "boiled";

  return getProductFamilyImage(family);
}

export function CartPill() {
  const router = useRouter();
  const pathname = usePathname();
  const { draft, patchDraft } = useDraft();
  const cart = useMemo(() => getDraftCartView(draft), [draft]);
  const lineCount = draft.lineItems.length;
  const prevCount = useRef(lineCount);
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  const justAdded = lineCount > prevCount.current;
  const isEditorialMenu = pathname === "/menu-editorial";
  const isProductPage = pathname.startsWith("/product/");
  const supportsDrawer =
    pathname === "/menu" ||
    pathname === "/menu-editorial" ||
    pathname.startsWith("/product/") ||
    pathname === "/checkout";
  const shouldHide =
    pathname === "/" ||
    pathname === "/cart" ||
    pathname === "/demo" ||
    pathname === "/investor-demo" ||
    pathname === "/contact" ||
    pathname === "/account" ||
    pathname === "/delivery/address" ||
    pathname === "/delivery/result" ||
    pathname === "/pickup" ||
    pathname.startsWith("/pickup/") ||
    pathname.startsWith("/track/");
  const shouldRenderPill = pathname !== "/checkout" && !isEditorialMenu && !isProductPage && lineCount > 0;

  const contextSnapshot = useMemo(
    () =>
      getMenuSnapshotForContext({
        fulfillmentMode: draft.fulfillmentMode ?? "delivery",
        locationId: draft.locationId,
        servicePointId: draft.servicePointId,
      }),
    [draft.fulfillmentMode, draft.locationId, draft.servicePointId],
  );

  const drawerUpsell = useMemo(() => {
    const anchorFamilies = draft.lineItems
      .map((lineItem) =>
        contextSnapshot.visibleItems.find((entry) => entry.item.id === lineItem.itemId)?.item.productFamily,
      )
      .filter((family): family is string => Boolean(family));

    if (anchorFamilies.length === 0) {
      return null;
    }

    return (
      getContextUpsellItems({
        visibleItems: contextSnapshot.visibleItems,
        excludedItemIds: draft.lineItems.map((lineItem) => lineItem.itemId),
        anchorFamilies,
        limit: 1,
      })[0] ?? null
    );
  }, [contextSnapshot.visibleItems, draft.lineItems]);

  const serviceResolved = hasResolvedServiceContext(draft);
  const serviceEyebrow = getServiceEyebrow(draft.fulfillmentMode);
  const serviceMeta = getServiceMeta({
    fulfillmentMode: draft.fulfillmentMode,
    serviceResolved,
    serviceLabel: cart.serviceLabel,
    etaLabel: cart.etaLabel ?? cart.serviceTimingLabel,
    issueCount: cart.revalidationIssues.length,
  });

  const primaryHref =
    lineCount === 0
      ? null
      : serviceResolved
        ? "/checkout"
        : getContextHref(draft.fulfillmentMode);
  const primaryLabel =
    lineCount === 0
      ? null
      : serviceResolved
        ? "Оформить"
        : draft.fulfillmentMode === "pickup"
          ? "Подтвердить самовывоз"
          : "Подтвердить адрес";
  const serviceFeeLabel =
    draft.fulfillmentMode === "pickup"
      ? "0 ₽"
      : cart.fee > 0
        ? formatMoney(cart.fee)
        : "уточним";

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    prevCount.current = lineCount;
  }, [lineCount]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleOpen = () => {
      if (pathname === "/menu" || pathname === "/menu-editorial" || pathname.startsWith("/product/")) {
        setOpen(true);
      }
    };

    window.addEventListener(CART_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(CART_OPEN_EVENT, handleOpen);
  }, [pathname]);

  if (shouldHide || (!supportsDrawer && lineCount === 0)) {
    return null;
  }

  const handleUpsellAdd = (itemId: string) => {
    const entry = contextSnapshot.visibleItems.find((candidate) => candidate.item.id === itemId);

    if (!entry) return;

    patchDraft({
      lineItems: appendDraftLineItem(draft.lineItems, buildDefaultDraftLineItem(entry.item)),
    });
  };

  const handleContinueChoosing = () => {
    setOpen(false);
    if (isEditorialMenu) {
      scrollToEditorialCatalog();
    }
  };

  return portalReady
    ? createPortal(
        <>
          <AnimatePresence>
            {shouldRenderPill ? (
              <motion.button
                type="button"
                className="cart-pill"
                onClick={() => (supportsDrawer ? setOpen(true) : router.push("/cart"))}
                aria-label="Открыть заказ"
                initial={{ x: 18, opacity: 0 }}
                animate={{
                  x: 0,
                  opacity: 1,
                  scale: justAdded ? [1, 1.05, 1] : 1,
                }}
                exit={{ x: 18, opacity: 0 }}
                transition={{ duration: 0.28 }}
              >
                <span className="cart-pill__icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 9.5h10l-.9 9.2a1.4 1.4 0 0 1-1.39 1.3H9.29a1.4 1.4 0 0 1-1.39-1.3L7 9.5Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.2 9.3V7.9A2.8 2.8 0 0 1 12 5.1a2.8 2.8 0 0 1 2.8 2.8v1.4"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>

                <span className="cart-pill__copy">
                  <span className="cart-pill__eyebrow">Ваш стол</span>
                  <strong className="cart-pill__count">{lineCount} поз.</strong>
                </span>

                <strong className="cart-pill__total">{cart.totalLabel}</strong>
              </motion.button>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {supportsDrawer && open ? (
              <motion.div
                className="cart-drawer__backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                onClick={() => setOpen(false)}
              >
                <motion.aside
                  className="cart-drawer"
                  initial={{ x: 44, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 44, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="cart-drawer__header">
                    <div className="cart-drawer__header-copy">
                      <span className="cart-drawer__eyebrow">{serviceEyebrow}</span>
                      <h3 className="cart-drawer__title">Ваш стол</h3>
                      {serviceMeta ? (
                        <p className="cart-drawer__service">{serviceMeta}</p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className="cart-drawer__close"
                      aria-label="Закрыть корзину"
                      onClick={() => setOpen(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
                          stroke="currentColor"
                          strokeWidth="1.45"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="cart-drawer__body">
                    {lineCount === 0 ? (
                      <section className="cart-drawer__empty">
                        <span className="cart-drawer__eyebrow">Пока пусто</span>
                        <h4 className="cart-drawer__empty-title">Добавьте первую позицию к столу.</h4>
                        <p className="cart-drawer__empty-copy">Выберите первую позицию из меню.</p>
                        <button
                          type="button"
                          className="cart-drawer__ghost-button"
                          onClick={handleContinueChoosing}
                        >
                          Смотреть меню
                        </button>
                      </section>
                    ) : (
                      <>
                        <div className="cart-drawer__list">
                          {draft.lineItems.map((item, index) => {
                            const modifierRows = item.summaryLines
                              .map((line) => parseSummaryLine(line))
                              .filter((row): row is ModifierRow => Boolean(row));
                            const bundledSubItems = cart.bundledSubItems[index] ?? [];

                            return (
                              <article key={`${item.itemId}-${index}`} className="cart-drawer__line">
                                <div className="cart-drawer__line-head">
                                  <div className="cart-drawer__thumb" aria-hidden="true">
                                    <Image
                                      src={getLineProductImage(item, contextSnapshot.visibleItems)}
                                      alt=""
                                      fill
                                      sizes="58px"
                                      className="cart-drawer__thumb-image"
                                    />
                                  </div>

                                  <div className="cart-drawer__line-copy">
                                    <div className="cart-drawer__line-top">
                                      <strong className="cart-drawer__line-name">{item.itemName}</strong>
                                      <strong className="cart-drawer__line-price">
                                        {formatMoney(item.totalPrice)}
                                      </strong>
                                    </div>

                                    {modifierRows.length > 0 ? (
                                      <div className="cart-drawer__modifier-list">
                                        {modifierRows.map((row, rowIndex) => (
                                          <div
                                            key={`${row.label}-${row.value}-${rowIndex}`}
                                            className="cart-drawer__modifier-row"
                                          >
                                            <span className="cart-drawer__modifier-label">
                                              {row.label}
                                            </span>
                                            <span className="cart-drawer__modifier-value">
                                              {row.value}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}

                                    {bundledSubItems.length > 0 ? (
                                      <div className="cart-drawer__bundles">
                                        <span className="cart-drawer__bundle-title">К блюду</span>
                                        <div className="cart-drawer__bundle-list">
                                          {bundledSubItems.map((subItem) => (
                                            <span
                                              key={`${subItem.parentItemId}-${subItem.id}`}
                                              className="cart-drawer__bundle-tag"
                                            >
                                              {subItem.title} ×{subItem.quantity}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                <div
                                  className={`cart-drawer__line-actions${
                                    item.quantityEditable === false
                                      ? " cart-drawer__line-actions--static"
                                      : ""
                                  }`}
                                >
                                  {item.quantityEditable === false ? (
                                    <div />
                                  ) : (
                                    <div className="cart-drawer__stepper">
                                      <button
                                        type="button"
                                        className="cart-drawer__stepper-button"
                                        onClick={() =>
                                          patchDraft({
                                            lineItems: decrementDraftLineItemQuantity(
                                              draft.lineItems,
                                              index,
                                            ),
                                          })
                                        }
                                      >
                                        −
                                      </button>
                                      <strong className="cart-drawer__stepper-value">
                                        {item.quantity}
                                      </strong>
                                      <button
                                        type="button"
                                        className="cart-drawer__stepper-button"
                                        onClick={() =>
                                          patchDraft({
                                            lineItems: incrementDraftLineItemQuantity(
                                              draft.lineItems,
                                              index,
                                            ),
                                          })
                                        }
                                      >
                                        +
                                      </button>
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    className="cart-drawer__line-remove"
                                    onClick={() =>
                                      patchDraft({
                                        lineItems: removeDraftLineItem(draft.lineItems, index),
                                      })
                                    }
                                  >
                                    Убрать
                                  </button>
                                </div>
                              </article>
                            );
                          })}
                        </div>

                        {drawerUpsell ? (
                          <section className="cart-drawer__upsell">
                            <span className="cart-drawer__eyebrow">Еще к столу</span>

                            <article className="cart-drawer__upsell-item">
                              <div className="cart-drawer__upsell-thumb" aria-hidden="true">
                                <Image
                                  src={getProductFamilyImage(drawerUpsell.item.productFamily)}
                                  alt=""
                                  fill
                                  sizes="54px"
                                  className="cart-drawer__thumb-image"
                                />
                              </div>

                              <div className="cart-drawer__upsell-copy">
                                <strong className="cart-drawer__upsell-name">
                                  {drawerUpsell.item.name}
                                </strong>
                                <p className="cart-drawer__upsell-note">
                                  {getUpsellNote(drawerUpsell)}
                                </p>
                              </div>

                              <div className="cart-drawer__upsell-meta">
                                <strong className="cart-drawer__upsell-price">
                                  от {formatMoney(drawerUpsell.effectiveBasePrice)}
                                </strong>
                                <button
                                  type="button"
                                  className="cart-drawer__quiet-button"
                                  onClick={() => handleUpsellAdd(drawerUpsell.item.id)}
                                >
                                  Добавить
                                </button>
                              </div>
                            </article>
                          </section>
                        ) : null}
                      </>
                    )}
                  </div>

                  <div className="cart-drawer__footer">
                    {lineCount > 0 ? (
                      <>
                        <div className="cart-drawer__totals">
                          <div className="cart-drawer__total-row">
                            <span>Позиции</span>
                            <strong>{cart.subtotalLabel}</strong>
                          </div>
                          <div className="cart-drawer__total-row">
                            <span>
                              {draft.fulfillmentMode === "pickup" ? "Самовывоз" : "Доставка"}
                            </span>
                            <strong>{serviceFeeLabel}</strong>
                          </div>
                          <div className="cart-drawer__total-row cart-drawer__total-row--grand">
                            <span>Итого</span>
                            <strong>{cart.totalLabel}</strong>
                          </div>
                        </div>

                        {primaryHref && primaryLabel ? (
                          <Link
                            href={primaryHref}
                            className="cart-drawer__submit"
                            onClick={() => setOpen(false)}
                          >
                            {primaryLabel}
                          </Link>
                        ) : null}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="cart-drawer__submit"
                        onClick={handleContinueChoosing}
                      >
                        Смотреть меню
                      </button>
                    )}
                  </div>
                </motion.aside>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>,
        document.body,
      )
    : null;
}

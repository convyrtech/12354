"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { dispatchCartOpen } from "@/components/cart-events";
import { useDraft } from "@/components/draft-provider";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getProductFamilyImage } from "@/lib/category-images";
import { getDraftCartView, getFulfillmentLabel } from "@/lib/draft-view";
import {
  formatMoney,
  getMenuItem,
  getMenuItemSnapshotForContext,
  getMenuSnapshotForContext,
  getProductCommercialTruth,
  getRoutingAssignmentDisplay,
  type FulfillmentMode,
  type MenuAvailabilityState,
  type ModifierGroup,
} from "@/lib/fixtures";
import {
  appendDraftLineItem,
  buildDraftLineItem,
  getDefaultModifierSelections,
  type DraftModifierSelection,
} from "@/lib/line-item";
import { getContextUpsellItems, getUpsellNote } from "@/lib/upsells";

type ProductPageProps = {
  productId: string;
  origin?: "editorial" | "menu";
};

type PreviewRow = {
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

function getServiceLabel(input: {
  fulfillmentMode: FulfillmentMode;
  serviceLabel: string;
  typedAddress: string;
}) {
  if (input.serviceLabel) return input.serviceLabel;
  if (input.typedAddress) return input.typedAddress;
  return input.fulfillmentMode === "pickup" ? "Самовывоз" : "Адрес не выбран";
}

function getAvailabilityMeta(state: MenuAvailabilityState) {
  if (state === "available") {
    return {
      label: "Подтверждено для вашего адреса",
      color: "rgba(215, 239, 241, 0.96)",
      border: "rgba(99, 188, 197, 0.28)",
      background: "rgba(99, 188, 197, 0.12)",
    };
  }

  if (state === "sold_out") {
    return {
      label: "Временная пауза",
      color: "rgba(255, 223, 211, 0.96)",
      border: "rgba(199, 105, 74, 0.28)",
      background: "rgba(199, 105, 74, 0.12)",
    };
  }

  return {
    label: "Нужно уточнить адрес",
    color: "rgba(255, 218, 218, 0.96)",
    border: "rgba(180, 74, 74, 0.28)",
    background: "rgba(180, 74, 74, 0.12)",
  };
}

function toggleSelection(
  current: DraftModifierSelection[],
  group: ModifierGroup,
  optionId: string,
) {
  const selection = current.find((entry) => entry.groupId === group.id);
  const currentOptionIds = selection?.optionIds ?? [];
  let nextOptionIds = currentOptionIds;

  if (group.maxSelections === 1) {
    nextOptionIds = [optionId];
  } else if (currentOptionIds.includes(optionId)) {
    const reduced = currentOptionIds.filter((entry) => entry !== optionId);
    nextOptionIds = reduced.length >= group.minSelections ? reduced : currentOptionIds;
  } else {
    nextOptionIds = [...currentOptionIds, optionId].slice(-group.maxSelections);
  }

  if (!selection) {
    return [...current, { groupId: group.id, optionIds: nextOptionIds }];
  }

  return current.map((entry) =>
    entry.groupId === group.id ? { ...entry, optionIds: nextOptionIds } : entry,
  );
}

function parsePreviewRow(line: string): PreviewRow | null {
  const separatorIndex = line.indexOf(":");

  if (separatorIndex === -1) {
    const value = line.trim();
    return value ? { label: "Параметр", value } : null;
  }

  const rawLabel = line.slice(0, separatorIndex).trim();
  const value = line.slice(separatorIndex + 1).trim();

  if (!value) return null;

  return {
    label: SUMMARY_LABEL_MAP[rawLabel] ?? rawLabel,
    value,
  };
}

function getOptionDeltaLabel(optionPriceDelta: number) {
  if (optionPriceDelta === 0) {
    return null;
  }

  return `${optionPriceDelta > 0 ? "+" : "-"}${formatMoney(Math.abs(optionPriceDelta))}`;
}

function getProductHref(productId: string, origin: "editorial" | "menu") {
  return origin === "editorial" ? `/product/${productId}?from=editorial` : `/product/${productId}`;
}

export function ProductPage({
  productId,
  origin = "menu",
}: ProductPageProps) {
  const { draft, patchDraft } = useDraft();
  const item = getMenuItem(productId);
  const [selections, setSelections] = useState<DraftModifierSelection[]>(() =>
    item ? getDefaultModifierSelections(item) : [],
  );
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setSelections(item ? getDefaultModifierSelections(item) : []);
    setAdded(false);
  }, [item, productId]);

  const fulfillment = (draft.fulfillmentMode ?? "delivery") as FulfillmentMode;
  const menuHref = origin === "editorial" ? "/menu-editorial" : `/menu?fulfillment=${fulfillment}`;
  const contextHref = fulfillment === "pickup" ? "/pickup/points" : "/delivery/address";
  const cart = useMemo(() => getDraftCartView(draft), [draft]);
  const serviceLabel = getServiceLabel({
    fulfillmentMode: fulfillment,
    serviceLabel: draft.serviceLabel,
    typedAddress: draft.typedAddress,
  });
  const timingLabel =
    draft.serviceTimingLabel ||
    cart.etaLabel ||
    (fulfillment === "pickup"
      ? "Выберите окно"
      : "Выберите адрес");

  const snapshot = useMemo(
    () =>
      item
        ? getMenuItemSnapshotForContext({
            item,
            fulfillmentMode: fulfillment,
            locationId: draft.locationId,
            servicePointId: draft.servicePointId,
          })
        : null,
    [draft.locationId, draft.servicePointId, fulfillment, item],
  );

  const contextSnapshot = useMemo(
    () =>
      getMenuSnapshotForContext({
        fulfillmentMode: fulfillment,
        locationId: draft.locationId,
        servicePointId: draft.servicePointId,
      }),
    [draft.locationId, draft.servicePointId, fulfillment],
  );

  const truth = useMemo(() => (item ? getProductCommercialTruth(item) : null), [item]);
  const routingDisplay = getRoutingAssignmentDisplay({
    locationId: draft.locationId,
    servicePointId: draft.servicePointId,
    legalEntityId: draft.legalEntityId,
  });

  const previewLine = useMemo(
    () =>
      item && snapshot ? buildDraftLineItem(item, selections, snapshot.effectiveBasePrice) : null,
    [item, selections, snapshot],
  );

  const previewRows = useMemo(
    () => (previewLine?.summaryLines ?? []).map((line) => parsePreviewRow(line)).filter((row): row is PreviewRow => Boolean(row)),
    [previewLine?.summaryLines],
  );

  const currentPrice = previewLine?.unitPrice ?? snapshot?.effectiveBasePrice ?? 0;
  const canAdd = Boolean(snapshot && snapshot.state === "available" && previewLine);
  const availabilityMeta = snapshot ? getAvailabilityMeta(snapshot.state) : null;
  const displayLocationLabel =
    draft.locationId || draft.servicePointId
      ? routingDisplay.locationLabel
      : fulfillment === "pickup"
        ? "Точка не выбрана"
        : "Адрес не выбран";
  const displayServicePointLabel =
    draft.servicePointId && routingDisplay.servicePointLabel !== "Ещё не назначена"
      ? routingDisplay.servicePointLabel
      : null;

  const upsellItems = useMemo(() => {
    if (!item) return [];

    return getContextUpsellItems({
      visibleItems: contextSnapshot.visibleItems,
      excludedItemIds: [item.id, ...draft.lineItems.map((lineItem) => lineItem.itemId)],
      anchorFamilies: [item.productFamily],
      limit: 3,
    });
  }, [contextSnapshot.visibleItems, draft.lineItems, item]);

  const handleSelectOption = useCallback((group: ModifierGroup, optionId: string) => {
    setSelections((prev) => toggleSelection(prev, group, optionId));
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!previewLine || !snapshot || snapshot.state !== "available") return;

    patchDraft({
      lineItems: appendDraftLineItem(draft.lineItems, previewLine),
      orderStage: "product",
    });

    dispatchCartOpen();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [draft.lineItems, patchDraft, previewLine, snapshot]);

  const handleUpsellAdd = useCallback(
    (entry: (typeof upsellItems)[number]) => {
      const lineItem = buildDraftLineItem(
        entry.item,
        getDefaultModifierSelections(entry.item),
        entry.effectiveBasePrice,
      );

      patchDraft({
        lineItems: appendDraftLineItem(draft.lineItems, lineItem),
        orderStage: "product",
      });
      dispatchCartOpen();
    },
    [draft.lineItems, patchDraft],
  );

  if (!item) {
    return (
      <main className="product-editorial product-editorial--missing">
        <div className="product-editorial__missing">
          <span className="product-editorial__missing-eyebrow">Товар не найден</span>
          <h1 className="product-editorial__missing-title">Похоже, этой позиции больше нет в витрине.</h1>
          <Link href="/menu-editorial" className="product-editorial__secondary-link">
            Вернуться в меню
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="product-editorial">
      <div className="menu-editorial__controls product-editorial__controls">
        <Link href={menuHref} className="menu-editorial__control menu-editorial__control--menu">
          <span className="product-editorial__back-arrow" aria-hidden>
            ←
          </span>
          <span>Меню</span>
        </Link>

        <div className="menu-editorial__control-stack">
          <Link href="/account" className="menu-editorial__icon-control" aria-label="Аккаунт">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M5.6 19c1.4-3 4-4.6 6.4-4.6s5 1.6 6.4 4.6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </Link>

          <button
            type="button"
            className="menu-editorial__control menu-editorial__control--cart"
            onClick={() => dispatchCartOpen()}
            aria-label="Открыть корзину"
          >
            <span>Корзина</span>
            <strong>{draft.lineItems.length}</strong>
          </button>
        </div>
      </div>

      <section className="product-editorial__hero">
        <motion.div
          className="product-editorial__hero-media"
          animate={{ scale: [1.02, 1.05, 1.02] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(5, 10, 13, 0.12) 0%, rgba(5, 10, 13, 0.44) 40%, rgba(5, 10, 13, 0.9) 100%), url("${getProductFamilyImage(item.productFamily)}")`,
          }}
        />
        <div className="product-editorial__hero-overlay" />
        <div className="product-editorial__hero-grain" />

        <div className="product-editorial__hero-inner">
          <ScrollReveal>
            <div className="product-editorial__hero-grid">
              <div className="product-editorial__hero-copy">
                <span className="product-editorial__brand">The Raki</span>

                {availabilityMeta ? (
                  <span
                    className="product-editorial__availability"
                    style={{
                      color: availabilityMeta.color,
                      borderColor: availabilityMeta.border,
                      background: availabilityMeta.background,
                    }}
                  >
                    {availabilityMeta.label}
                  </span>
                ) : null}

                <span className="product-editorial__category">{item.category}</span>
                <h1 className="product-editorial__title">{item.name}</h1>
                <p className="product-editorial__description">{item.description}</p>

                {truth?.truthChips.length ? (
                  <div className="product-editorial__truth-chips">
                    {truth.truthChips.slice(0, 4).map((chip) => (
                      <span key={chip} className="product-editorial__truth-chip">
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="product-editorial__service-card">
                <div className="product-editorial__service-section">
                  <span className="product-editorial__service-label">К оплате</span>
                  <strong className="product-editorial__service-price">{formatMoney(currentPrice)}</strong>
                </div>

                <div className="product-editorial__service-grid">
                  <div className="product-editorial__service-item">
                    <span className="product-editorial__service-label">Подача</span>
                    <strong>{getFulfillmentLabel(fulfillment)}</strong>
                    <span>{serviceLabel}</span>
                  </div>

                  <div className="product-editorial__service-item">
                    <span className="product-editorial__service-label">Тайминг</span>
                    <strong>{timingLabel}</strong>
                    <span>{displayServicePointLabel ?? displayLocationLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="product-editorial__workbench">
        <div className="product-editorial__workbench-inner">
          <ScrollReveal className="product-editorial__summary-shell">
            <aside className="product-editorial__summary">
              <div className="product-editorial__summary-head">
                <strong className="product-editorial__summary-name">
                  {previewLine?.itemName ?? item.name}
                </strong>
              </div>

              {previewRows.length ? (
                <div className="product-editorial__summary-list">
                  {previewRows.map((row) => (
                    <div
                      key={`${row.label}-${row.value}`}
                      className="product-editorial__summary-row"
                    >
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="product-editorial__summary-total">
                <span>К оплате</span>
                <strong>{formatMoney(currentPrice)}</strong>
              </div>

              <div className="product-editorial__summary-actions">
                {canAdd ? (
                  <button
                    type="button"
                    className="product-editorial__submit"
                    onClick={handleAddToCart}
                  >
                    <AnimatePresence mode="wait">
                      {added ? (
                        <motion.span
                          key="added"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                        >
                          Добавлено к заказу
                        </motion.span>
                      ) : (
                        <motion.span
                          key="add"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                        >
                          Добавить к заказу
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                ) : (
                  <Link href={contextHref} className="product-editorial__submit">
                    Уточнить обслуживание
                  </Link>
                )}

                <div className="product-editorial__summary-secondary">
                  <button
                    type="button"
                    className="product-editorial__secondary-button"
                    onClick={() => dispatchCartOpen()}
                  >
                    Корзина
                  </button>

                  <Link href={menuHref} className="product-editorial__secondary-link">
                    Вернуться в меню
                  </Link>
                </div>
              </div>
            </aside>
          </ScrollReveal>

          <div className="product-editorial__config">
            {snapshot && snapshot.state !== "available" ? (
              <ScrollReveal delay={0.05}>
                <div
                  className="product-editorial__config-block product-editorial__config-block--warning"
                  style={{
                    borderColor: availabilityMeta?.border,
                    background: availabilityMeta?.background,
                  }}
                >
                  <p>{snapshot.reason}</p>
                  <Link href={contextHref} className="product-editorial__inline-link">
                    Уточнить обслуживание
                  </Link>
                </div>
              </ScrollReveal>
            ) : null}

            {item.modifierGroups.map((group, index) => {
              const selectedOptionIds =
                selections.find((selection) => selection.groupId === group.id)?.optionIds ?? [];

              return (
                <ScrollReveal key={group.id} delay={0.08 + index * 0.04}>
                  <section className="product-editorial__config-block">
                    <div className="product-editorial__config-head">
                      <h3>{group.label}</h3>
                      <span className="product-editorial__config-meta">
                        {group.minSelections === group.maxSelections
                          ? `${group.minSelections} выбор`
                          : `до ${group.maxSelections} вариантов`}
                      </span>
                    </div>

                    <div
                      className={
                        group.kind === "core"
                          ? "product-editorial__option-grid"
                          : "product-editorial__option-grid product-editorial__option-grid--compact"
                      }
                    >
                      {group.options.map((option) => {
                        const isSelected = selectedOptionIds.includes(option.id);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`product-editorial__option${
                              isSelected ? " product-editorial__option--selected" : ""
                            }${
                              group.kind !== "core" ? " product-editorial__option--compact" : ""
                            }`}
                            onClick={() => handleSelectOption(group, option.id)}
                          >
                            <span className="product-editorial__option-label">{option.label}</span>
                            {getOptionDeltaLabel(option.priceDelta) ? (
                              <span className="product-editorial__option-meta">
                                {getOptionDeltaLabel(option.priceDelta)}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {upsellItems.length > 0 ? (
        <section className="product-editorial__pairings">
          <div className="product-editorial__pairings-inner">
            <ScrollReveal>
              <div className="product-editorial__pairings-head">
                <h2>Еще к столу</h2>
              </div>
            </ScrollReveal>

            <div className="product-editorial__pairings-grid">
              {upsellItems.map((entry, index) => (
                <ScrollReveal key={entry.item.id} delay={0.08 + index * 0.04}>
                  <article className="product-editorial__pairing-card">
                    <div
                      className="product-editorial__pairing-media"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(8, 16, 20, 0.08) 0%, rgba(8, 16, 20, 0.58) 100%), url("${getProductFamilyImage(entry.item.productFamily)}")`,
                      }}
                    />
                    <div className="product-editorial__pairing-body">
                      <span className="product-editorial__panel-eyebrow">{entry.item.category}</span>
                      <strong className="product-editorial__pairing-name">{entry.item.name}</strong>
                      <p className="product-editorial__pairing-note">{getUpsellNote(entry)}</p>

                      <div className="product-editorial__pairing-footer">
                        <strong className="product-editorial__pairing-price">
                          от {formatMoney(entry.effectiveBasePrice)}
                        </strong>

                        <div className="product-editorial__pairing-actions">
                          <Link
                            href={getProductHref(entry.item.id, origin)}
                            className="product-editorial__secondary-link"
                          >
                            Открыть
                          </Link>
                          <button
                            type="button"
                            className="product-editorial__secondary-button"
                            onClick={() => handleUpsellAdd(entry)}
                          >
                            В заказ
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

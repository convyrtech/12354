"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDraft } from "@/components/draft-provider";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getProductFamilyImage } from "@/lib/category-images";
import { getDraftCartView, getFulfillmentLabel } from "@/lib/draft-view";
import {
  formatMoney,
  getMenuItem,
  getMenuSnapshotForContext,
  getMenuItemSnapshotForContext,
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
};

function getServiceLabel(input: {
  fulfillmentMode: FulfillmentMode;
  serviceLabel: string;
  typedAddress: string;
}) {
  if (input.serviceLabel) return input.serviceLabel;
  if (input.typedAddress) return input.typedAddress;
  return input.fulfillmentMode === "pickup"
    ? "Точку выдачи уточним перед подтверждением"
    : "Адрес уточним перед подтверждением";
}

function getAvailabilityMeta(state: MenuAvailabilityState) {
  if (state === "available") {
    return {
      label: "Подтверждено для вашего адреса",
      color: "var(--accent)",
      border: "rgba(99, 188, 197, 0.24)",
      background: "rgba(99, 188, 197, 0.08)",
    };
  }

  if (state === "sold_out") {
    return {
      label: "Временная пауза",
      color: "var(--warning)",
      border: "rgba(199, 105, 74, 0.24)",
      background: "rgba(199, 105, 74, 0.08)",
    };
  }

  return {
    label: "Нужно уточнить адрес",
    color: "var(--error)",
    border: "rgba(180, 74, 74, 0.24)",
    background: "rgba(180, 74, 74, 0.08)",
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

export function ProductPage({ productId }: ProductPageProps) {
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
  const contextHref = fulfillment === "pickup" ? "/pickup/points" : "/delivery/address";
  const serviceLabel = getServiceLabel({
    fulfillmentMode: fulfillment,
    serviceLabel: draft.serviceLabel,
    typedAddress: draft.typedAddress,
  });
  const cart = useMemo(() => getDraftCartView(draft), [draft]);
  const timingLabel =
    draft.serviceTimingLabel ||
    cart.etaLabel ||
    (fulfillment === "pickup" ? "Окно подтвердим после точки выдачи" : "Время подтвердим после адреса");
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
  const displayLocationLabel =
    draft.locationId || draft.servicePointId
      ? routingDisplay.locationLabel
      : "Кухню закрепим после подтверждения адреса";
  const displayServicePointLabel =
    draft.servicePointId && routingDisplay.servicePointLabel !== "Ещё не назначена"
      ? routingDisplay.servicePointLabel
      : null;
  const previewLine = useMemo(
    () =>
      item && snapshot ? buildDraftLineItem(item, selections, snapshot.effectiveBasePrice) : null,
    [item, selections, snapshot],
  );
  const currentPrice = previewLine?.unitPrice ?? snapshot?.effectiveBasePrice ?? 0;
  const canAdd = Boolean(snapshot && snapshot.state === "available" && previewLine);
  const availabilityMeta = snapshot ? getAvailabilityMeta(snapshot.state) : null;
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
    const nextLineItems = appendDraftLineItem(draft.lineItems, previewLine);
    patchDraft({ lineItems: nextLineItems, orderStage: "product" });
    window.dispatchEvent(new CustomEvent("raki:cart-open"));
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
      window.dispatchEvent(new CustomEvent("raki:cart-open"));
    },
    [draft.lineItems, patchDraft, upsellItems],
  );

  if (!item) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "100vh", paddingTop: 80 }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 className="text-h1" style={{ marginBottom: "var(--space-md)" }}>
            Товар не найден
          </h1>
          <Link href="/menu" className="cta cta--primary">
            Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "100px var(--space-lg) var(--space-xl)" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <ScrollReveal>
          <div
            className="flex items-center justify-between"
            style={{
              gap: "var(--space-md)",
              marginBottom: "calc(var(--space-lg) + 6px)",
              paddingBottom: "var(--space-md)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center" style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}>
              <Link href="/menu" className="text-muted" style={{ fontSize: 14 }}>
                Каталог
              </Link>
              <span className="text-dim">/</span>
              <span className="text-muted" style={{ fontSize: 14 }}>
                {item.category}
              </span>
            </div>

            <div className="flex items-center" style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}>
              <span className="text-muted" style={{ fontSize: 13 }}>
                {getFulfillmentLabel(fulfillment)}
              </span>
              <span className="text-dim">•</span>
              <span className="text-muted" style={{ fontSize: 13 }}>
                {serviceLabel}
              </span>
            </div>
          </div>
        </ScrollReveal>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.08fr 0.92fr",
            gap: "var(--space-xl)",
          }}
        >
          <section style={{ display: "grid", gap: "var(--space-lg)" }}>
          <ScrollReveal as="section">
            <div
              style={{
                minHeight: 540,
                overflow: "hidden",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-elevated)",
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `linear-gradient(180deg, rgba(6, 12, 16, 0.08) 0%, rgba(6, 12, 16, 0.72) 68%, rgba(6, 12, 16, 0.94) 100%), url("${getProductFamilyImage(item.productFamily)}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />

                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    height: "100%",
                    padding: "calc(var(--space-lg) + 10px)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                <div>
                  {availabilityMeta ? (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        paddingTop: 10,
                        borderTop: `1px solid ${availabilityMeta.border}`,
                        color: availabilityMeta.color,
                        fontSize: 12,
                        marginBottom: "var(--space-md)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      {availabilityMeta.label}
                    </div>
                  ) : null}

                  <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
                    {item.category}
                  </span>
                  <h1
                    className="font-display"
                    style={{ fontSize: "clamp(40px, 4.2vw, 62px)", lineHeight: 0.98, maxWidth: 520 }}
                  >
                    {item.name}
                  </h1>
                  <p
                    className="text-muted"
                    style={{
                      fontSize: 15,
                      lineHeight: 1.75,
                      maxWidth: 380,
                      marginTop: "var(--space-md)",
                    }}
                  >
                    {item.description}
                  </p>
                </div>

                <div style={{ display: "grid", gap: "var(--space-md)" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "var(--space-sm)",
                    }}
                  >
                    <div
                      style={{
                        paddingTop: 12,
                        borderTop: "1px solid rgba(99, 188, 197, 0.22)",
                        backgroundColor: "rgba(7,12,16,0.22)",
                      }}
                    >
                      <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                        Цена
                      </span>
                      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                        {formatMoney(currentPrice)}
                      </div>
                      <div className="text-muted" style={{ lineHeight: 1.6 }}>
                        по вашему адресу
                      </div>
                    </div>

                    <div
                      style={{
                        paddingTop: 12,
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        backgroundColor: "rgba(7,12,16,0.22)",
                      }}
                    >
                      <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                        Формат
                      </span>
                      <div className="text-muted" style={{ lineHeight: 1.6 }}>
                        {getFulfillmentLabel(fulfillment)}
                      </div>
                    </div>

                    <div
                      style={{
                        paddingTop: 12,
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        backgroundColor: "rgba(7,12,16,0.22)",
                      }}
                    >
                      <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                        Время
                      </span>
                      <div className="text-muted" style={{ lineHeight: 1.6 }}>
                        {timingLabel}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.06}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
                gap: "var(--space-sm)",
              }}
            >
              <div
                style={{
                  padding: "var(--space-lg)",
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid rgba(99, 188, 197, 0.12)",
                  background:
                    "linear-gradient(180deg, rgba(99, 188, 197, 0.08) 0%, rgba(15, 26, 34, 0.78) 100%)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                  По вашему адресу
                </span>
                <strong style={{ display: "block", marginBottom: 10, fontSize: 20 }}>
                  {serviceLabel}
                </strong>
                <div className="text-muted" style={{ lineHeight: 1.75, display: "grid", gap: 4 }}>
                  <div>{getFulfillmentLabel(fulfillment)}</div>
                  <div>{timingLabel}</div>
                  {displayServicePointLabel ? <div>{displayServicePointLabel}</div> : null}
                </div>
              </div>

              <div
                style={{
                  padding: "var(--space-lg)",
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  backgroundColor: "rgba(15, 26, 34, 0.6)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                  Что по подаче
                </span>
                <strong style={{ display: "block", marginBottom: 10, fontSize: 20 }}>
                  {displayLocationLabel}
                </strong>
                <div className="text-muted" style={{ lineHeight: 1.75, display: "grid", gap: 6 }}>
                  {displayServicePointLabel ? <div>{displayServicePointLabel}</div> : null}
                  {(truth?.truthLines ?? []).slice(0, 3).map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
          </section>

          <section style={{ display: "grid", gap: "calc(var(--space-md) + 8px)" }}>
            <ScrollReveal delay={0.04}>
              <div
                style={{
                  padding: "0 0 calc(var(--space-md) + 6px)",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
                        Подача к вашему столу
                </span>
                <h2 style={{ fontSize: 26, marginBottom: "var(--space-sm)" }}>
                  Настройте подачу под свой стол.
                </h2>
                <p className="text-muted" style={{ fontSize: 15, lineHeight: 1.8 }}>
                  Размер, рецепт и сумма уже считаются по вашему адресу или точке выдачи,
                  без лишних шагов и без обещаний, которые не подтвердит команда.
                </p>
              </div>
            </ScrollReveal>

            {snapshot && snapshot.state !== "available" ? (
              <ScrollReveal delay={0.12}>
                <div
                  style={{
                    padding: "var(--space-lg)",
                    borderRadius: "var(--radius-xl)",
                    border: `1px solid ${availabilityMeta?.border ?? "rgba(180, 74, 74, 0.24)"}`,
                    backgroundColor: availabilityMeta?.background ?? "rgba(180, 74, 74, 0.08)",
                  }}
                >
                  <span
                    className="text-eyebrow block"
                    style={{ marginBottom: 6, color: availabilityMeta?.color }}
                  >
                    Товар сейчас не подтверждаем
                  </span>
                  <div className="text-muted" style={{ lineHeight: 1.75, marginBottom: "var(--space-md)" }}>
                    {snapshot.reason}
                  </div>
                  <Link href={contextHref} className="cta cta--secondary">
                    Уточнить обслуживание
                  </Link>
                </div>
              </ScrollReveal>
            ) : null}

            <ScrollReveal delay={0.16}>
              <div
                style={{
                  padding: "var(--space-xl)",
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(15, 26, 34, 0.84) 100%)",
                  display: "grid",
                  gap: "var(--space-lg)",
                  boxShadow: "0 24px 64px rgba(0, 0, 0, 0.14)",
                }}
              >
                {item.modifierGroups.map((group) => {
                  const selectedOptionIds =
                    selections.find((selection) => selection.groupId === group.id)?.optionIds ?? [];

                  return (
                    <div key={group.id}>
                      <div
                        className="flex items-center justify-between"
                        style={{ gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}
                      >
                        <div>
                          <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                            {group.kind === "core" ? "Основной выбор" : "Тонкая настройка"}
                          </span>
                          <strong style={{ fontSize: 20 }}>{group.label}</strong>
                        </div>
                        <span className="text-muted" style={{ fontSize: 13 }}>
                          {group.minSelections === group.maxSelections
                            ? `${group.minSelections} выбор`
                            : `до ${group.maxSelections} вариантов`}
                        </span>
                      </div>

                      {group.helpText ? (
                        <p
                          className="text-muted"
                          style={{ fontSize: 14, lineHeight: 1.7, marginBottom: "var(--space-sm)" }}
                        >
                          {group.helpText}
                        </p>
                      ) : null}

                      <div
                        style={
                          group.kind === "core"
                            ? {
                                display: "grid",
                                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                gap: "var(--space-xs)",
                              }
                            : {
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "var(--space-xs)",
                              }
                        }
                      >
                        {group.options.map((option) => {
                          const isSelected = selectedOptionIds.includes(option.id);

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleSelectOption(group, option.id)}
                              style={{
                                padding: group.kind === "core" ? "14px 16px" : "12px 18px",
                                minHeight: group.kind === "core" ? 72 : undefined,
                                borderRadius: "var(--radius-md)",
                                border: `1px solid ${isSelected ? "rgba(99, 188, 197, 0.4)" : "var(--border)"}`,
                                backgroundColor: isSelected
                                  ? "rgba(99, 188, 197, 0.12)"
                                  : "rgba(255,255,255,0.02)",
                                color: isSelected ? "var(--text-primary)" : "var(--text-muted)",
                                fontSize: 14,
                                cursor: "pointer",
                                transition: "all var(--duration-short) var(--ease-out)",
                                textAlign: "left",
                                display: "flex",
                                flexDirection: group.kind === "core" ? "column" : "row",
                                alignItems: group.kind === "core" ? "flex-start" : "center",
                                justifyContent: group.kind === "core" ? "space-between" : "flex-start",
                                gap: group.kind === "core" ? 8 : 0,
                              }}
                            >
                              <span>{option.label}</span>
                              {option.priceDelta !== 0 ? (
                                <span
                                  style={{
                                    marginLeft: group.kind === "core" ? 0 : 8,
                                    fontSize: 12,
                                    opacity: 0.72,
                                  }}
                                >
                                  {option.priceDelta > 0 ? "+" : ""}
                                  {formatMoney(option.priceDelta)}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div
                style={{
                  padding: "var(--space-xl)",
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--border)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(15, 26, 34, 0.88) 100%)",
                  display: "grid",
                  gap: "var(--space-lg)",
                }}
              >
                <div
                  className="flex items-end justify-between"
                  style={{ gap: "var(--space-md)", flexWrap: "wrap" }}
                >
                  <div>
                    <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                      Текущая строка заказа
                    </span>
                    <strong style={{ display: "block", fontSize: 24 }}>
                      {previewLine?.itemName ?? item.name}
                    </strong>
                  </div>

                  <motion.div
                    key={currentPrice}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: "right" }}
                  >
                    <div className="text-eyebrow" style={{ marginBottom: 6 }}>
                      К оплате
                    </div>
                    <div className="font-display" style={{ fontSize: 42, lineHeight: 1 }}>
                      {formatMoney(currentPrice)}
                    </div>
                  </motion.div>
                </div>

                {previewLine?.summaryLines.length ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "var(--space-sm)",
                    }}
                  >
                    {previewLine.summaryLines.map((line) => (
                      <div
                        key={line}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          backgroundColor: "rgba(255,255,255,0.025)",
                        }}
                      >
                        <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
                          {line}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {item.bestEffortRequests?.length ? (
                  <div
                    style={{
                      padding: "var(--space-md)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid rgba(199, 105, 74, 0.24)",
                      backgroundColor: "rgba(199, 105, 74, 0.06)",
                    }}
                  >
                    <span className="text-eyebrow block" style={{ marginBottom: 6, color: "var(--warning)" }}>
                      Пожелание без гарантии
                    </span>
                    <div className="text-muted" style={{ lineHeight: 1.75 }}>
                      {item.bestEffortRequests[0]}
                    </div>
                  </div>
                ) : null}

                {item.note ? (
                  <div className="text-muted" style={{ lineHeight: 1.75 }}>
                    {item.note}
                  </div>
                ) : null}

                <div className="flex" style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="cta cta--primary"
                    onClick={handleAddToCart}
                    disabled={!canAdd}
                    style={{
                      minWidth: 220,
                      opacity: canAdd ? 1 : 0.5,
                      cursor: canAdd ? "pointer" : "not-allowed",
                    }}
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
                          {canAdd ? "Добавить к заказу" : "Сначала уточнить обслуживание"}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>

                  <Link href="/cart" className="cta cta--ghost">
                    Открыть заказ
                  </Link>
                  <Link href="/menu" className="cta cta--ghost">
                    Вернуться в каталог
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </section>
        </div>

        {upsellItems.length > 0 ? (
          <section style={{ marginTop: "var(--space-2xl)" }}>
            <ScrollReveal delay={0.08}>
              <div
                className="flex items-end justify-between"
                style={{ gap: "var(--space-md)", marginBottom: "var(--space-sm)", flexWrap: "wrap" }}
              >
                <div>
                  <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                    К этому часто добавляют
                  </span>
                  <h2 className="text-h2" style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>
                    Можно добавить к подаче.
                  </h2>
                </div>
                <div className="text-muted" style={{ maxWidth: 420, lineHeight: 1.75 }}>
                  Дополнения к подаче, которые поддерживают основной выбор и не спорят с ним.
                </div>
              </div>
            </ScrollReveal>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "var(--space-sm)",
              }}
            >
              {upsellItems.map((entry, index) => (
                <ScrollReveal key={entry.item.id} delay={0.12 + index * 0.04}>
                  <article
                    style={{
                      overflow: "hidden",
                      borderRadius: "var(--radius-xl)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(15, 26, 34, 0.9) 100%)",
                    }}
                  >
                    <div
                      style={{
                        height: 168,
                        backgroundImage: `linear-gradient(180deg, rgba(8,16,20,0.08) 0%, rgba(8,16,20,0.52) 100%), url("${getProductFamilyImage(entry.item.productFamily)}")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                    <div style={{ padding: "var(--space-lg)" }}>
                      <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                        {entry.item.category}
                      </span>
                      <strong
                        style={{
                          display: "block",
                          fontSize: 22,
                          lineHeight: 1.16,
                          marginBottom: "var(--space-xs)",
                          fontFamily: "var(--font-display), serif",
                        }}
                      >
                        {entry.item.name}
                      </strong>
                      <div className="text-muted" style={{ lineHeight: 1.75, marginBottom: "var(--space-md)" }}>
                        {getUpsellNote(entry)}
                      </div>
                      <div
                        className="flex items-center justify-between"
                        style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}
                      >
                        <div>
                          <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                            От
                          </span>
                          <strong style={{ fontSize: 20 }}>{formatMoney(entry.effectiveBasePrice)}</strong>
                        </div>
                        <div className="flex" style={{ gap: "var(--space-xs)" }}>
                          <Link href={`/product/${entry.item.id}`} className="cta cta--ghost">
                            Открыть
                          </Link>
                          <button
                            type="button"
                            className="cta cta--primary"
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
          </section>
        ) : null}
      </div>
    </div>
  );
}

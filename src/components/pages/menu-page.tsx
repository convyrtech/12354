"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDraft } from "@/components/draft-provider";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getProductFamilyImage } from "@/lib/category-images";
import { getDraftCartView, getFulfillmentLabel } from "@/lib/draft-view";
import {
  formatMoney,
  getMenuSnapshotForContext,
  getProductCommercialTruth,
  getRoutingAssignmentDisplay,
  type FulfillmentMode,
  type MenuSnapshotItem,
} from "@/lib/fixtures";
import {
  appendDraftLineItem,
  buildDraftLineItem,
  getDefaultModifierSelections,
  type DraftModifierSelection,
} from "@/lib/line-item";
import { getContextUpsellItems, getUpsellNote } from "@/lib/upsells";

const FEATURED_FAMILIES = ["boiled", "fried", "live"] as const;

const CATEGORY_ORDER = [
  "Креветки Магаданские / Медведка",
  "Камчатский краб",
  "Мидии",
  "Икра",
  "Десерты",
  "Напитки",
  "Подарки",
] as const;

const COMPACT_CATEGORIES = new Set([
  "Креветки Магаданские / Медведка",
  "Камчатский краб",
  "Десерты",
  "Мидии",
  "Икра",
  "Напитки",
  "Подарки",
]);

type CatalogSection = {
  id: string;
  name: string;
  eyebrow: string;
  items: MenuSnapshotItem[];
  compact: boolean;
};

function getCategorySlug(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "");
}

function getCategoryEyebrow(category: string) {
  if (category === "Креветки Магаданские / Медведка") return "Креветки";
  if (category === "Камчатский краб") return "Краб";
  return category;
}

function getPositionCountLabel(count: number) {
  if (count === 1) return "1 позиция";
  if (count >= 2 && count <= 4) return `${count} позиции`;
  return `${count} позиций`;
}

function getCatalogImagePosition(index: number, compact: boolean) {
  if (compact) {
    return ["28% center", "50% center", "72% center"][index % 3] ?? "center";
  }

  return ["center", "28% center", "72% center"][index % 3] ?? "center";
}

function getMenuCardDescription(entry: MenuSnapshotItem) {
  switch (entry.item.productFamily) {
    case "boiled":
    case "fried":
    case "live":
      return "Размер, вес и рецепт можно собрать сразу, без перехода на отдельный экран.";
    case "shrimp":
      return "На льду, отварные и обжаренные: вес и соусы можно выбрать сразу.";
    case "crab":
      return "Деликатесная линия для щедрого стола и сильного первого впечатления.";
    case "mussels":
      return "Горячая морская подача в выбранном соусе, если хочется усилить основной заказ.";
    case "caviar":
      return "Спокойное деликатесное усиление к ракам, креветкам или крабу.";
    case "drink":
      return "Холодное сопровождение к подаче без лишнего шума в заказе.";
    case "dessert":
      return "Небольшой финал к столу, если хочется закончить заказ мягко.";
    case "gift":
      return "Подарочный жест без выбора конкретной позиции для получателя.";
    default:
      return entry.item.description;
  }
}

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

function getConfiguratorLead(entry: MenuSnapshotItem) {
  switch (entry.item.productFamily) {
    case "boiled":
    case "fried":
    case "live":
      return "Размер, вес и рецепт можно выбрать сразу, не уходя со страницы каталога.";
    case "shrimp":
      return "Вес и соусы можно выбрать сразу, не уходя со страницы каталога.";
    case "mussels":
      return "Соус и формат подачи можно выбрать сразу, не уходя со страницы каталога.";
    default:
      return "Главные детали можно собрать сразу, не уходя со страницы каталога.";
  }
}

function toggleSelection(
  current: DraftModifierSelection[],
  groupId: string,
  optionId: string,
  maxSelections: number,
) {
  return current.map((selection) => {
    if (selection.groupId !== groupId) {
      return selection;
    }

    if (maxSelections <= 1) {
      return { ...selection, optionIds: [optionId] };
    }

    if (selection.optionIds.includes(optionId)) {
      const nextIds = selection.optionIds.filter((value) => value !== optionId);
      return {
        ...selection,
        optionIds: nextIds.length > 0 ? nextIds : [optionId],
      };
    }

    return {
      ...selection,
      optionIds: [...selection.optionIds, optionId].slice(0, maxSelections),
    };
  });
}

function buildCatalogSections(visibleItems: MenuSnapshotItem[]) {
  const grouped = new Map<string, MenuSnapshotItem[]>();

  visibleItems
    .filter(
      (entry) =>
        !FEATURED_FAMILIES.includes(
          entry.item.productFamily as (typeof FEATURED_FAMILIES)[number],
        ),
    )
    .forEach((entry) => {
      const bucket = grouped.get(entry.item.category) ?? [];
      bucket.push(entry);
      grouped.set(entry.item.category, bucket);
    });

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((category) => grouped.has(category)),
    ...[...grouped.keys()].filter(
      (category) => !CATEGORY_ORDER.includes(category as (typeof CATEGORY_ORDER)[number]),
    ),
  ];

  return orderedCategories.map(
    (category) =>
      ({
        id: getCategorySlug(category),
        name: category,
        eyebrow: getCategoryEyebrow(category),
        items: grouped.get(category) ?? [],
        compact: COMPACT_CATEGORIES.has(category),
      }) satisfies CatalogSection,
  );
}

export function MenuPage() {
  const { draft, patchDraft } = useDraft();

  const fulfillment = (draft.fulfillmentMode ?? "delivery") as FulfillmentMode;
  const contextHref = fulfillment === "pickup" ? "/pickup/points" : "/delivery/address";
  const snapshot = useMemo(
    () =>
      getMenuSnapshotForContext({
        fulfillmentMode: fulfillment,
        locationId: draft.locationId,
        servicePointId: draft.servicePointId,
      }),
    [draft.locationId, draft.servicePointId, fulfillment],
  );
  const cart = useMemo(() => getDraftCartView(draft), [draft]);

  const routingDisplay = getRoutingAssignmentDisplay({
    locationId: draft.locationId,
    servicePointId: draft.servicePointId,
    legalEntityId: draft.legalEntityId,
  });
  const displayLocationLabel =
    draft.locationId || draft.servicePointId
      ? routingDisplay.locationLabel
      : fulfillment === "pickup"
        ? "Точку выдачи подтвердим перед заказом"
        : "Кухню закрепим после подтверждения адреса";
  const catalogHeroImage = getProductFamilyImage(fulfillment === "pickup" ? "live" : "boiled");
  const featuredItems = useMemo(
    () =>
      snapshot.visibleItems.filter((entry) =>
        FEATURED_FAMILIES.includes(
          entry.item.productFamily as (typeof FEATURED_FAMILIES)[number],
        ),
      ),
    [snapshot.visibleItems],
  );
  const catalogSections = useMemo(
    () => buildCatalogSections(snapshot.visibleItems),
    [snapshot.visibleItems],
  );
  const serviceLabel = getServiceLabel({
    fulfillmentMode: fulfillment,
    serviceLabel: draft.serviceLabel,
    typedAddress: draft.typedAddress,
  });
  const timingLabel =
    draft.serviceTimingLabel ||
    cart.etaLabel ||
    (fulfillment === "pickup" ? "Окно выдачи уточняется" : "Время уточняется");
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [modalSelections, setModalSelections] = useState<DraftModifierSelection[]>([]);
  const [portalReady, setPortalReady] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);
  const modalOverlayRef = useRef<HTMLDivElement | null>(null);
  const modalCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  const activeEntry = useMemo(
    () =>
      activeProductId
        ? snapshot.visibleItems.find((entry) => entry.item.id === activeProductId) ?? null
        : null,
    [activeProductId, snapshot.visibleItems],
  );
  const activeTruth = activeEntry ? getProductCommercialTruth(activeEntry.item) : null;
  const modalLineItem = useMemo(
    () =>
      activeEntry
        ? buildDraftLineItem(activeEntry.item, modalSelections, activeEntry.effectiveBasePrice)
        : null,
    [activeEntry, modalSelections],
  );
  const modalUpsells = useMemo(
    () =>
      activeEntry
        ? getContextUpsellItems({
            visibleItems: snapshot.visibleItems,
            excludedItemIds: [activeEntry.item.id],
            anchorFamilies: [activeEntry.item.productFamily],
            limit: 3,
          })
        : [],
    [activeEntry, snapshot.visibleItems],
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!activeEntry) return;
    setModalSelections(getDefaultModifierSelections(activeEntry.item));
  }, [activeEntry]);

  useEffect(() => {
    if (!activeEntry) return;

    let firstFrame = 0;
    let secondFrame = 0;
    let thirdTimeout: number | null = null;
    let fourthTimeout: number | null = null;
    let fifthTimeout: number | null = null;

    const resetModalScroll = () => {
      if (modalOverlayRef.current) {
        modalOverlayRef.current.scrollTop = 0;
      }
      if (!modalBodyRef.current) return;
      modalBodyRef.current.scrollTop = 0;
      modalBodyRef.current.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        resetModalScroll();
      });
    });

    thirdTimeout = window.setTimeout(resetModalScroll, 24);
    fourthTimeout = window.setTimeout(resetModalScroll, 96);
    fifthTimeout = window.setTimeout(() => {
      resetModalScroll();
      modalCloseButtonRef.current?.focus({ preventScroll: true });
    }, 180);

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      if (thirdTimeout) window.clearTimeout(thirdTimeout);
      if (fourthTimeout) window.clearTimeout(fourthTimeout);
      if (fifthTimeout) window.clearTimeout(fifthTimeout);
    };
  }, [activeEntry]);

  useEffect(() => {
    if (!activeProductId) return;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [activeProductId]);

  const openProductOverlay = useCallback((entry: MenuSnapshotItem) => {
    setActiveProductId(entry.item.id);
  }, []);

  const closeProductOverlay = useCallback(() => {
    setActiveProductId(null);
  }, []);

  const handleQuickAdd = useCallback(
    (entry: MenuSnapshotItem) => {
      const lineItem = buildDraftLineItem(
        entry.item,
        getDefaultModifierSelections(entry.item),
        entry.effectiveBasePrice,
      );
      const nextLineItems = appendDraftLineItem(draft.lineItems, lineItem);
      patchDraft({ lineItems: nextLineItems, orderStage: "menu" });
      window.dispatchEvent(new CustomEvent("raki:cart-open"));
    },
    [draft.lineItems, patchDraft],
  );

  const handleModalAdd = useCallback(() => {
    if (!modalLineItem) return;
    const nextLineItems = appendDraftLineItem(draft.lineItems, modalLineItem);
    patchDraft({ lineItems: nextLineItems, orderStage: "menu" });
    setActiveProductId(null);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("raki:cart-open"));
    }, 220);
  }, [draft.lineItems, modalLineItem, patchDraft]);

  return (
    <div style={{ minHeight: "100vh", padding: "132px var(--space-lg) var(--space-xl)" }}>
      <div style={{ maxWidth: 1380, margin: "0 auto" }}>
        <section style={{ marginBottom: "var(--space-2xl)" }}>
          <ScrollReveal>
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                padding: "calc(var(--space-2xl) + 10px)",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--border)",
                backgroundColor: "rgba(10, 18, 24, 0.92)",
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `linear-gradient(110deg, rgba(7, 14, 18, 0.95) 0%, rgba(7, 14, 18, 0.82) 42%, rgba(7, 14, 18, 0.42) 100%), url("${catalogHeroImage}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.88,
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.08fr) minmax(320px, 0.72fr)",
                  gap: "calc(var(--space-xl) + 10px)",
                  alignItems: "end",
                }}
              >
                <div>
                  <div className="flex" style={{ gap: "var(--space-xs)", flexWrap: "wrap", marginBottom: "var(--space-md)" }}>
                    <span className="text-eyebrow">Каталог</span>
                    <span className="text-eyebrow" style={{ color: "var(--accent)" }}>
                      {getFulfillmentLabel(fulfillment)}
                    </span>
                  </div>

                  <h1 className="text-h1" style={{ marginBottom: "var(--space-sm)", maxWidth: 680 }}>
                    {fulfillment === "pickup" ? "Что забирают к столу." : "Что подают к столу."}
                  </h1>
                  <p className="text-muted" style={{ fontSize: 17, maxWidth: 640, lineHeight: 1.8 }}>
                    {fulfillment === "pickup"
                      ? "Главные позиции можно выбрать сразу. Остальное команда спокойно соберёт под точку выдачи и удобное окно."
                      : "Главные позиции можно выбрать сразу. Остальное команда спокойно соберёт под адрес, время и формат подачи."}
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: "var(--space-sm)",
                      marginTop: "calc(var(--space-xl) - 2px)",
                    }}
                  >
                    <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <span className="text-eyebrow block" style={{ marginBottom: 6 }}>Собирают сейчас</span>
                      <div className="text-muted" style={{ lineHeight: 1.7 }}>
                        {getPositionCountLabel(snapshot.visibleItems.length)} уже можно спокойно выбрать.
                      </div>
                    </div>

                    <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <span className="text-eyebrow block" style={{ marginBottom: 6 }}>Уточняют по адресу</span>
                      <div className="text-muted" style={{ lineHeight: 1.7 }}>
                        {snapshot.unavailableItems.length > 0
                          ? "Редкие позиции откроем после подтверждения адреса или точки."
                          : "Основной заказ собран без лишнего шума и запасных позиций."}
                      </div>
                    </div>

                    <div style={{ paddingTop: 12, borderTop: "1px solid rgba(99, 188, 197, 0.24)" }}>
                      <span className="text-eyebrow block" style={{ marginBottom: 6 }}>Собрать можно сразу</span>
                      <div className="text-muted" style={{ lineHeight: 1.7 }}>
                        {cart.lineCount > 0
                          ? `${getPositionCountLabel(cart.lineCount)} на ${cart.totalLabel}.`
                          : "Корзину можно собрать прямо отсюда, не бегая по страницам."}
                      </div>
                    </div>
                  </div>

                  <div className="flex" style={{ gap: "var(--space-sm)", marginTop: "calc(var(--space-lg) + 10px)", flexWrap: "wrap" }}>
                    <Link href={contextHref} className="cta cta--secondary">Уточнить адрес</Link>
                    <Link href="/cart" className="cta cta--ghost">Открыть заказ</Link>
                  </div>
                </div>

                <div
                  style={{
                    padding: "calc(var(--space-lg) + 2px)",
                    borderRadius: "var(--radius-xl)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backgroundColor: "rgba(10, 18, 24, 0.62)",
                    backdropFilter: "blur(12px)",
                    display: "grid",
                    gap: "var(--space-md)",
                    alignContent: "start",
                  }}
                >
                  <div style={{ paddingBottom: "var(--space-sm)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-eyebrow block" style={{ marginBottom: 6 }}>Под ваш адрес</span>
                    <strong style={{ display: "block", fontSize: 24, lineHeight: 1.2, marginBottom: 8 }}>
                      {serviceLabel}
                    </strong>
                    <div className="text-muted" style={{ lineHeight: 1.7 }}>{timingLabel}</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-md)" }}>
                    <div style={{ paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <span className="text-eyebrow block" style={{ marginBottom: 6 }}>Кухня и маршрут</span>
                      <strong style={{ display: "block", fontSize: 18, marginBottom: 6 }}>{displayLocationLabel}</strong>
                      <div className="text-muted" style={{ lineHeight: 1.7 }}>Сверим по адресу и подтвердим перед звонком.</div>
                    </div>

                    <div style={{ paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <span className="text-eyebrow block" style={{ marginBottom: 6 }}>Формат подачи</span>
                      <strong style={{ display: "block", fontSize: 18, marginBottom: 6 }}>
                        {getFulfillmentLabel(fulfillment)}
                      </strong>
                      <div className="text-muted" style={{ lineHeight: 1.7 }}>Подбор и подача держатся в одном спокойном маршруте.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        <div style={{ display: "grid", gap: "calc(var(--space-xl) + 8px)" }}>
          <section
            style={{
              padding: "18px 20px",
              borderRadius: "var(--radius-xl)",
              border: "1px solid rgba(255,255,255,0.06)",
              backgroundColor: "rgba(12, 22, 28, 0.72)",
            }}
          >
            <div className="flex items-start justify-between" style={{ gap: "var(--space-md)", flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: "var(--space-sm)" }}>
                <span className="text-eyebrow">Разделы</span>
                <div className="flex flex-wrap" style={{ gap: "var(--space-xs)" }}>
                  <a href="#featured-catalog" className="cta cta--ghost" style={{ padding: "10px 14px" }}>
                    Главные линии
                  </a>
                  {catalogSections.map((section) => (
                    <a
                      key={section.id}
                      href={`#category-${section.id}`}
                      className="cta cta--ghost"
                      style={{ padding: "10px 14px" }}
                    >
                      {section.eyebrow}
                    </a>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gap: "var(--space-2xs)", minWidth: 260, paddingTop: 4 }}>
                <span className="text-eyebrow">Под ваш маршрут</span>
                <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.75 }}>
                  {fulfillment === "pickup"
                    ? "Каталог уже сверяем под точку выдачи."
                    : "Каталог уже сверяем под адрес и подачу."}
                </div>
                <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.75 }}>{timingLabel}</div>
                {cart.lineCount > 0 ? (
                  <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.75 }}>
                    В заказе {getPositionCountLabel(cart.lineCount)} на {cart.totalLabel}.
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <main>
            <section id="featured-catalog" style={{ marginBottom: "var(--space-3xl)" }}>
              <ScrollReveal>
                <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
                  С чего обычно начинают
                </span>
                <h2 className="text-h2" style={{ marginBottom: "var(--space-lg)" }}>
                  Варёные, жареные и живые раки.
                </h2>
              </ScrollReveal>

              <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.92fr 0.92fr", gap: "calc(var(--space-md) + 2px)" }}>
                {featuredItems.map((entry, index) => {
                  const truth = getProductCommercialTruth(entry.item);
                  return (
                    <ScrollReveal key={entry.item.id} delay={index * 0.08}>
                      <motion.article
                        whileHover={{ y: -6 }}
                        onClick={() => openProductOverlay(entry)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openProductOverlay(entry);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        style={{
                          minHeight: index === 0 ? 520 : 430,
                          position: "relative",
                          overflow: "hidden",
                          borderRadius: "var(--radius-xl)",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--bg-elevated)",
                          cursor: "pointer",
                        }}
                      >
                        <motion.div
                          style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage: `linear-gradient(180deg, rgba(8,16,20,0.06) 0%, rgba(8,16,20,0.42) 52%, rgba(8,16,20,0.9) 100%), url("${getProductFamilyImage(entry.item.productFamily)}")`,
                            backgroundSize: "cover",
                            backgroundPosition: getCatalogImagePosition(index, false),
                          }}
                          whileHover={{ scale: 1.04 }}
                          transition={{ duration: 7, ease: "linear" }}
                        />

                        <div style={{ position: "relative", zIndex: 1, height: "100%", padding: "calc(var(--space-lg) + 4px)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div className="flex items-center justify-between" style={{ gap: "var(--space-sm)" }}>
                            <span className="text-eyebrow" style={{ color: "var(--text-primary)" }}>
                              {entry.item.category}
                            </span>
                            <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>
                              от {formatMoney(entry.effectiveBasePrice)}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-display" style={{ fontSize: index === 0 ? "clamp(36px, 4vw, 56px)" : "clamp(28px, 3vw, 40px)", lineHeight: 1.02, marginBottom: "var(--space-sm)" }}>
                              {entry.item.name}
                            </h3>
                            <p className="text-muted" style={{ fontSize: 14, maxWidth: 360, lineHeight: 1.8 }}>
                              {truth.truthLines[0] ?? entry.item.description}
                            </p>
                          </div>

                          <div style={{ display: "grid", gap: "var(--space-md)" }}>
                            <div className="flex flex-wrap" style={{ gap: "var(--space-xs)" }}>
                              {truth.truthChips.slice(0, 1).map((chip) => (
                                <span key={chip} style={{ padding: "10px 0 0", minWidth: 116, borderTop: "1px solid rgba(255,255,255,0.12)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-primary)" }}>
                                  {chip}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center justify-between" style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}>
                              <Link
                                href={`/product/${entry.item.id}`}
                                className="cta cta--ghost"
                                onClick={(event) => event.stopPropagation()}
                              >
                                Страница
                              </Link>
                              <span
                                style={{
                                  padding: "10px 14px",
                                  borderRadius: "999px",
                                  border: "1px solid rgba(255,255,255,0.16)",
                                  backgroundColor: "rgba(8,16,20,0.42)",
                                  fontSize: 12,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                }}
                              >
                                Выбрать
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    </ScrollReveal>
                  );
                })}
              </div>
            </section>

            {snapshot.soldOutItems.length > 0 ? (
              <ScrollReveal delay={0.08}>
                <section
                  style={{
                    marginBottom: "var(--space-2xl)",
                    padding: "var(--space-lg)",
                    borderRadius: "var(--radius-xl)",
                    border: "1px solid rgba(199, 105, 74, 0.22)",
                    backgroundColor: "rgba(199, 105, 74, 0.04)",
                  }}
                >
                  <div className="flex items-baseline justify-between" style={{ gap: "var(--space-md)", marginBottom: "var(--space-md)" }}>
                    <div>
                      <span className="text-eyebrow block" style={{ marginBottom: 6, color: "var(--warning)" }}>
                        Сегодня не подтверждаем
                      </span>
                      <strong style={{ fontSize: 22 }}>
                        Часть позиций откроется после другого адреса или другого формата подачи.
                      </strong>
                    </div>
                    <span className="text-muted" style={{ fontSize: 14, maxWidth: 360 }}>
                      Для текущих условий оставляем только то, что команда может подтвердить без лишних обещаний.
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-sm)" }}>
                    {snapshot.soldOutItems.slice(0, 4).map((entry) => (
                      <div
                        key={entry.item.id}
                        style={{
                          padding: "var(--space-md)",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "rgba(15, 26, 34, 0.54)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <strong style={{ display: "block", marginBottom: 6 }}>{entry.item.name}</strong>
                        <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.65 }}>
                          {entry.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </ScrollReveal>
            ) : null}

            {catalogSections.map((section, sectionIndex) => (
              <section key={section.id} id={`category-${section.id}`} style={{ marginBottom: "var(--space-2xl)" }}>
                <ScrollReveal delay={sectionIndex * 0.04}>
                  <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
                    {section.eyebrow}
                  </span>
                  <h2 className="text-h2" style={{ fontSize: "clamp(24px, 3vw, 36px)", marginBottom: "var(--space-lg)" }}>
                    {section.name}
                  </h2>
                </ScrollReveal>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: section.compact
                      ? "repeat(auto-fit, minmax(340px, 1fr))"
                      : "repeat(2, minmax(0, 1fr))",
                    gap: "var(--space-sm)",
                  }}
                >
                  {section.items.map((entry, index) => (
                    <ScrollReveal key={entry.item.id} delay={index * 0.04}>
                      {section.compact ? (
                        <motion.article
                          whileHover={{ y: -4 }}
                          style={{
                            padding: "calc(var(--space-md) + 6px)",
                            borderRadius: "var(--radius-lg)",
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--bg-elevated)",
                            display: "grid",
                            gridTemplateColumns: "148px minmax(0, 1fr)",
                            gap: "calc(var(--space-md) + 2px)",
                            alignItems: "start",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => openProductOverlay(entry)}
                            style={{
                              width: 148,
                              height: 176,
                              borderRadius: "var(--radius-md)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              backgroundImage: `linear-gradient(180deg, rgba(8,16,20,0.02) 0%, rgba(8,16,20,0.28) 100%), url("${getProductFamilyImage(entry.item.productFamily)}")`,
                              backgroundSize: "cover",
                              backgroundPosition: getCatalogImagePosition(index, true),
                              cursor: "pointer",
                            }}
                          />
                          <div style={{ minWidth: 0, display: "grid", gap: "var(--space-sm)" }}>
                            <div>
                              <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                                {section.eyebrow}
                              </span>
                              <strong
                                style={{
                                  display: "block",
                                  marginBottom: 10,
                                  fontSize: 22,
                                  lineHeight: 1.14,
                                  fontFamily: "var(--font-display), serif",
                                  fontWeight: 600,
                                }}
                              >
                                {entry.item.name}
                              </strong>
                              <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 12 }}>
                                {getMenuCardDescription(entry)}
                              </div>
                              <div style={{ color: "var(--accent)", fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                от {formatMoney(entry.effectiveBasePrice)}
                              </div>
                            </div>

                            <div className="flex items-center justify-between" style={{ gap: "var(--space-sm)", flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                              <Link href={`/product/${entry.item.id}`} className="cta cta--ghost" style={{ padding: "10px 14px", fontSize: 12 }}>
                                Страница
                              </Link>
                              <button type="button" className="cta cta--primary" style={{ padding: "10px 14px", fontSize: 12 }} onClick={() => openProductOverlay(entry)}>
                                Выбрать
                              </button>
                            </div>
                          </div>
                        </motion.article>
                      ) : (
                        <motion.article
                          whileHover={{ y: -4 }}
                          style={{
                            overflow: "hidden",
                            borderRadius: "var(--radius-xl)",
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--bg-elevated)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => openProductOverlay(entry)}
                            style={{
                              width: "100%",
                              height: 248,
                              backgroundImage: `linear-gradient(180deg, rgba(8,16,20,0.04) 0%, rgba(8,16,20,0.38) 100%), url("${getProductFamilyImage(entry.item.productFamily)}")`,
                              backgroundSize: "cover",
                              backgroundPosition: getCatalogImagePosition(index, false),
                              cursor: "pointer",
                            }}
                          />
                          <div style={{ padding: "var(--space-lg)" }}>
                            <div className="flex items-center justify-between" style={{ gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}>
                              <span className="text-eyebrow">{section.eyebrow}</span>
                              <span style={{ color: "var(--accent)", fontSize: 13 }}>
                                от {formatMoney(entry.effectiveBasePrice)}
                              </span>
                            </div>
                            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: "var(--space-xs)" }}>
                              {entry.item.name}
                            </h3>
                            <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.75, marginBottom: "var(--space-md)" }}>
                              {getMenuCardDescription(entry)}
                            </p>
                            <div className="flex items-center justify-between" style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}>
                              <Link href={`/product/${entry.item.id}`} className="cta cta--ghost">
                                Страница
                              </Link>
                              <button type="button" className="cta cta--primary" onClick={() => openProductOverlay(entry)}>
                                Выбрать
                              </button>
                            </div>
                          </div>
                        </motion.article>
                      )}
                    </ScrollReveal>
                  ))}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>

      {portalReady
        ? createPortal(
            <AnimatePresence>
              {activeEntry && modalLineItem ? (
                <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            ref={modalOverlayRef}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 120,
              backgroundColor: "rgba(3, 7, 10, 0.84)",
              backdropFilter: "blur(4px)",
              padding: "84px 28px 28px",
              overflow: "hidden",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
            onClick={closeProductOverlay}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{
                maxWidth: 1280,
                width: "100%",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 396px",
                gap: "20px",
                height: "calc(100vh - 112px)",
                maxHeight: "calc(100vh - 112px)",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "24px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(10, 18, 24, 0.94)",
                  height: "100%",
                }}
              >
                <div
                  style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `linear-gradient(180deg, rgba(9,17,22,0.18) 0%, rgba(9,17,22,0.36) 28%, rgba(9,17,22,0.68) 64%, rgba(9,17,22,0.94) 100%), url("${getProductFamilyImage(activeEntry.item.productFamily)}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
                <button
                  ref={modalCloseButtonRef}
                  type="button"
                  onClick={closeProductOverlay}
                  className="cta cta--ghost"
                  style={{
                    position: "absolute",
                    top: 26,
                    right: 28,
                    zIndex: 1,
                    width: 44,
                    height: 44,
                    padding: 0,
                    minWidth: 44,
                    borderRadius: "999px",
                    backgroundColor: "rgba(8, 16, 20, 0.78)",
                  }}
                  aria-label="Закрыть"
                >
                  ×
                </button>
                <div
                  style={{
                    position: "absolute",
                    left: 28,
                    right: 28,
                    bottom: 28,
                    zIndex: 1,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
                    <span className="text-eyebrow" style={{ color: "rgba(255,255,255,0.76)" }}>
                      {activeEntry.item.category}
                    </span>
                    <h2
                      className="font-display"
                      style={{ fontSize: "clamp(36px, 4vw, 54px)", lineHeight: 0.96 }}
                    >
                      {activeEntry.item.name}
                    </h2>
                    <p className="text-muted" style={{ lineHeight: 1.75, fontSize: 14, maxWidth: 460 }}>
                      {getMenuCardDescription(activeEntry)}
                    </p>
                  </div>

                  <div className="flex flex-wrap" style={{ gap: 8 }}>
                    {(activeTruth?.truthChips ?? []).slice(0, 2).map((chip) => (
                      <span
                        key={chip}
                        style={{
                          padding: "9px 12px",
                          borderRadius: "999px",
                          border: "1px solid rgba(255,255,255,0.14)",
                          backgroundColor: "rgba(10, 18, 24, 0.72)",
                          fontSize: 11,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {chip}
                      </span>
                    ))}
                    <span
                      style={{
                        padding: "9px 12px",
                        borderRadius: "999px",
                        border: "1px solid rgba(255,255,255,0.14)",
                        backgroundColor: "rgba(10, 18, 24, 0.72)",
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {formatMoney(modalLineItem.unitPrice)}
                    </span>
                  </div>
                  {activeTruth?.truthLines[1] ? (
                    <p className="text-muted" style={{ maxWidth: 460, lineHeight: 1.75, fontSize: 14 }}>
                      {activeTruth.truthLines[1]}
                    </p>
                  ) : null}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateRows: "auto minmax(0, 1fr) auto",
                  borderRadius: "24px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(8, 14, 18, 0.985)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "20px 20px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    backgroundColor: "rgba(10, 18, 24, 0.94)",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <span className="text-eyebrow">Соберите подачу</span>
                  <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.65 }}>
                    {getConfiguratorLead(activeEntry)}
                  </p>
                </div>
                <div
                  ref={modalBodyRef}
                  style={{ padding: "16px 20px 20px", overflowY: "auto", display: "grid", gap: 18 }}
                >
                  {activeEntry.item.modifierGroups.map((group) => {
                    const selection = modalSelections.find((item) => item.groupId === group.id);
                    return (
                      <section
                        key={group.id}
                        style={{
                          display: "grid",
                          gap: "var(--space-sm)",
                          paddingBottom: 16,
                          borderBottom: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div className="flex items-end justify-between" style={{ gap: "var(--space-md)", flexWrap: "wrap" }}>
                          <div>
                            <strong style={{ display: "block", fontSize: 20, marginBottom: 6 }}>
                              {group.label}
                            </strong>
                            {group.helpText ? (
                              <span className="text-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                                {group.helpText}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-eyebrow" style={{ color: "var(--accent)" }}>
                            {group.maxSelections > 1 ? "Можно сочетать" : "Выберите вариант"}
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(164px, 1fr))", gap: 10 }}>
                          {group.options.map((option) => {
                            const active = selection?.optionIds.includes(option.id) ?? false;
                            const priceDelta = option.priceDelta > 0 ? `+${formatMoney(option.priceDelta)}` : "в цене";

                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() =>
                                  setModalSelections((current) =>
                                    toggleSelection(current, group.id, option.id, group.maxSelections),
                                  )
                                }
                                style={{
                                  textAlign: "left",
                                  position: "relative",
                                  minHeight: 94,
                                  padding: "16px 16px 14px",
                                  borderRadius: "18px",
                                  border: active ? "1px solid rgba(99, 188, 197, 0.72)" : "1px solid rgba(255,255,255,0.08)",
                                  backgroundColor: active ? "rgba(99, 188, 197, 0.08)" : "rgba(14, 24, 30, 0.72)",
                                  boxShadow: active ? "0 0 0 1px rgba(99, 188, 197, 0.14) inset" : "none",
                                  cursor: "pointer",
                                  display: "grid",
                                  alignContent: "space-between",
                                  gap: 8,
                                }}
                              >
                                <span
                                  style={{
                                    position: "absolute",
                                    top: 12,
                                    right: 12,
                                    padding: "4px 8px",
                                    borderRadius: 999,
                                    border: active ? "1px solid rgba(99, 188, 197, 0.28)" : "1px solid rgba(255,255,255,0.1)",
                                    backgroundColor: active ? "rgba(99, 188, 197, 0.14)" : "rgba(255,255,255,0.04)",
                                    fontSize: 11,
                                    color: active ? "rgba(245,242,236,0.92)" : "rgba(245,242,236,0.62)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {priceDelta}
                                </span>
                                <strong style={{ fontSize: 16, lineHeight: 1.22, maxWidth: 110 }}>{option.label}</strong>
                                <span className="text-muted" style={{ fontSize: 11 }}>
                                  {active ? "Выбрано" : group.maxSelections > 1 ? "Можно сочетать" : "Один вариант"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}

                  {modalUpsells.length > 0 ? (
                    <section style={{ display: "grid", gap: 10 }}>
                      <div>
                        <strong style={{ display: "block", fontSize: 20, marginBottom: 6 }}>Еще к столу</strong>
                        <span className="text-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                          Небольшие позиции, которые удобно добавить сразу к основной подаче.
                        </span>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        {modalUpsells.map((entry) => (
                          <article
                            key={entry.item.id}
                            style={{
                              padding: "10px 0",
                              borderTop: "1px solid rgba(255,255,255,0.07)",
                              display: "grid",
                              gridTemplateColumns: "52px minmax(0, 1fr) auto",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                width: 52,
                                height: 52,
                                borderRadius: "14px",
                                overflow: "hidden",
                                border: "1px solid rgba(255,255,255,0.08)",
                                backgroundColor: "rgba(22, 34, 41, 0.92)",
                              }}
                            >
                              <img
                                src={getProductFamilyImage(entry.item.productFamily)}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ display: "block", fontSize: 14, lineHeight: 1.2, marginBottom: 4 }}>
                                {entry.item.name}
                              </strong>
                              <span className="text-muted" style={{ fontSize: 11, lineHeight: 1.45 }}>
                                {getUpsellNote(entry)}
                              </span>
                            </div>
                            <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
                              <span style={{ color: "var(--text-primary)", fontSize: 13, whiteSpace: "nowrap" }}>
                                от {formatMoney(entry.effectiveBasePrice)}
                              </span>
                              <button type="button" className="cta cta--ghost" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 14 }} onClick={() => handleQuickAdd(entry)}>
                                Добавить
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>

                <div style={{ padding: "16px 20px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(8, 16, 20, 0.86)", display: "grid", gap: 12 }}>
                  <div className="flex items-center justify-between" style={{ gap: "var(--space-md)", flexWrap: "wrap" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <span className="text-eyebrow">Итого за позицию</span>
                      <strong style={{ fontSize: 28, lineHeight: 1 }}>{formatMoney(modalLineItem.unitPrice)}</strong>
                    </div>
                    <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 260, textAlign: "right" }}>
                      {modalLineItem.summaryLines.slice(0, 2).join(" · ")}
                    </div>
                  </div>

                  <div className="flex items-center justify-between" style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}>
                    <Link href={`/product/${activeEntry.item.id}`} className="cta cta--ghost">
                      Полная страница
                    </Link>
                    <button type="button" className="cta cta--primary" onClick={handleModalAdd}>
                      Добавить — {formatMoney(modalLineItem.unitPrice)}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}

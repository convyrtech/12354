"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useDraft } from "@/components/draft-provider";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getProductFamilyImage } from "@/lib/category-images";
import { getCartStateLabel, getDraftCartView, getFulfillmentLabel } from "@/lib/draft-view";
import { formatMoney, getMenuSnapshotForContext, type FulfillmentMode, type MenuSnapshotItem } from "@/lib/fixtures";
import {
  appendDraftLineItem,
  buildDraftLineItem,
  decrementDraftLineItemQuantity,
  getDefaultModifierSelections,
  incrementDraftLineItemQuantity,
  removeDraftLineItem,
} from "@/lib/line-item";
import { getContextUpsellItems } from "@/lib/upsells";

const EMPTY_CART_HIGHLIGHTS = [
  {
    label: "Главное в меню",
    value: "Варёные, жареные и живые раки — с них обычно и начинают стол.",
  },
  {
    label: "Оплата",
    value: "После звонка команды и спокойного подтверждения заказа.",
  },
  {
    label: "Сервис",
    value: "Адрес или точку выдачи можно уточнить в любой момент до финального подтверждения.",
  },
] as const;

const EMPTY_CART_START_POINTS = [
  {
    title: "С чего начать",
    note: "Обычно начинают с раков — варёных, жареных или живых. Потом уже добирают всё остальное.",
  },
  {
    title: "Уточните условия",
    note: "Подтвердите адрес доставки или удобную точку самовывоза.",
  },
  {
    title: "Оставьте контакт",
    note: "Контакт и способ оплаты подтверждаются уже на следующем шаге.",
  },
] as const;

function getStateTone(state: string) {
  if (state === "below-minimum") return "var(--warning)";
  if (state === "invalidated") return "var(--error)";
  return "var(--accent)";
}

function getUpsellNote(entry: MenuSnapshotItem) {
  switch (entry.item.productFamily) {
    case "shrimp":
      return "К ракам и крабу часто добавляют креветочную линию с отдельной подачей и соусами.";
    case "crab":
      return "Деликатесная линия для более щедрого заказа и более сильного первого впечатления.";
    case "caviar":
      return "Тихое деликатесное усиление к основному заказу, не перегружая стол.";
    case "drink":
      return "Спокойное сопровождение к тёплой подаче и вечернему заказу.";
    case "dessert":
      return "Небольшой финал к заказу, если хочется закончить мягко и аккуратно.";
    case "mussels":
      return "Тёплая соседняя линия, если хочется добавить ещё один морской акцент.";
    default:
      return entry.item.description;
  }
}

export function CartPage() {
  const { draft, patchDraft } = useDraft();
  const cart = getDraftCartView(draft);
  const isEmpty = cart.lineItems.length === 0;
  const fulfillment = (draft.fulfillmentMode ?? "delivery") as FulfillmentMode;
  const contextHref = fulfillment === "pickup" ? "/pickup/points" : "/delivery/address";
  const menuHref = fulfillment === "pickup" ? "/menu?fulfillment=pickup" : "/menu?fulfillment=delivery";
  const serviceLabel =
    cart.serviceLabel ||
    (fulfillment === "pickup"
      ? "Точку выдачи уточним перед подтверждением"
      : "Адрес уточним перед подтверждением");
  const timingLabel =
    cart.serviceTimingLabel ||
    cart.etaLabel ||
    (fulfillment === "pickup"
      ? "Окно выдачи подтвердим после точки"
      : "Время подтвердим после адреса");
  const stateLabel = getCartStateLabel(cart.state, cart.lineCount);
  const stateTone = getStateTone(cart.state);
  const snapshot = useMemo(
    () =>
      getMenuSnapshotForContext({
        fulfillmentMode: fulfillment,
        locationId: draft.locationId,
        servicePointId: draft.servicePointId,
      }),
    [draft.locationId, draft.servicePointId, fulfillment],
  );
  const upsellItems = useMemo(() => {
    if (isEmpty) return [];
    return getContextUpsellItems({
      visibleItems: snapshot.visibleItems,
      excludedItemIds: cart.lineItems.map((item) => item.itemId),
      anchorFamilies: snapshot.visibleItems
        .filter((entry) => cart.lineItems.some((item) => item.itemId === entry.item.id))
        .map((entry) => entry.item.productFamily),
      limit: 3,
    });
  }, [cart.lineItems, isEmpty, snapshot.visibleItems]);

  const handleIncrement = useCallback(
    (index: number) => patchDraft({ lineItems: incrementDraftLineItemQuantity(draft.lineItems, index), orderStage: "cart" }),
    [draft.lineItems, patchDraft],
  );
  const handleDecrement = useCallback(
    (index: number) => patchDraft({ lineItems: decrementDraftLineItemQuantity(draft.lineItems, index), orderStage: "cart" }),
    [draft.lineItems, patchDraft],
  );
  const handleRemove = useCallback(
    (index: number) => patchDraft({ lineItems: removeDraftLineItem(draft.lineItems, index), orderStage: "cart" }),
    [draft.lineItems, patchDraft],
  );
  const handleUpsellAdd = useCallback(
    (entry: MenuSnapshotItem) => {
      const lineItem = buildDraftLineItem(
        entry.item,
        getDefaultModifierSelections(entry.item),
        entry.effectiveBasePrice,
      );

      patchDraft({
        lineItems: appendDraftLineItem(draft.lineItems, lineItem),
        orderStage: "cart",
      });
    },
    [draft.lineItems, patchDraft],
  );

  return (
    <div style={{ minHeight: "100vh", maxWidth: 1320, margin: "0 auto", padding: "108px var(--space-lg) var(--space-xl)" }}>
      <ScrollReveal>
        <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>Корзина</span>
        <h1 className="text-h1" style={{ marginBottom: "var(--space-sm)" }}>
          {isEmpty ? "Ваш заказ ещё не собран." : "Ваш заказ."}
        </h1>
        <p className="text-muted" style={{ fontSize: 16, maxWidth: 760, lineHeight: 1.8 }}>
          {isEmpty
            ? "Сначала выбирают, что будет на столе. Здесь спокойно проверяют итог перед подтверждением."
            : "Проверьте состав, сумму и переходите к подтверждению в удобный момент."}
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <div style={{ marginTop: "var(--space-xl)", marginBottom: "var(--space-xl)", display: "grid", gridTemplateColumns: "1.25fr 1fr 0.95fr", gap: "var(--space-md)" }}>
          <div style={{ padding: "14px 0 0", borderTop: "1px solid var(--border)" }}>
            <span className="text-eyebrow block" style={{ marginBottom: 6 }}>Частный сервис</span>
            <strong style={{ display: "block", fontSize: 18, marginBottom: 6 }}>{serviceLabel}</strong>
            <div className="text-muted" style={{ lineHeight: 1.7 }}>
              <div>{getFulfillmentLabel(draft.fulfillmentMode)}</div>
              <div>{timingLabel}</div>
            </div>
          </div>
          <div style={{ padding: "14px 0 0", borderTop: "1px solid var(--border)" }}>
              <span className="text-eyebrow block" style={{ marginBottom: 6 }}>Сверка</span>
              <strong style={{ display: "block", fontSize: 18, color: stateTone, marginBottom: 6 }}>{stateLabel}</strong>
              <div className="text-muted" style={{ lineHeight: 1.7 }}>
                {isEmpty
                  ? "Корзина пока пустая — сначала выберите, что будет на столе."
                  : cart.state === "ready"
                  ? "Состав соответствует текущему сервису и можно переходить к оформлению."
                  : cart.state === "below-minimum"
                    ? "Нужно добрать сумму до сервисного минимума."
                    : "После смены адреса или точки выдачи часть строк требует перепроверки."}
              </div>
          </div>
          <div style={{ padding: "14px 0 0", borderTop: "1px solid rgba(99, 188, 197, 0.22)" }}>
            <span className="text-eyebrow block" style={{ marginBottom: 6 }}>Дальше</span>
            <strong style={{ display: "block", fontSize: 18, marginBottom: 6 }}>Контакт и подтверждение</strong>
            <div className="text-muted" style={{ lineHeight: 1.7 }}>
              Контакт и предпочтительный способ оплаты подтверждаются на следующем шаге.
            </div>
          </div>
        </div>
      </ScrollReveal>

      {isEmpty ? (
        <ScrollReveal delay={0.08}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.88fr)", gap: "var(--space-sm)", alignItems: "stretch", borderTop: "1px solid var(--border)", paddingTop: "var(--space-2xl)" }}>
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                padding: "calc(var(--space-2xl) + 6px)",
                borderRadius: "var(--radius-xl)",
                border: "1px solid rgba(255,255,255,0.07)",
                background: "radial-gradient(circle at top left, rgba(99, 188, 197, 0.12) 0%, rgba(99, 188, 197, 0) 44%), rgba(15, 26, 34, 0.82)",
              }}
            >
              <div style={{ position: "absolute", inset: "auto -8% -24% auto", width: 280, height: 280, borderRadius: "50%", background: "rgba(99, 188, 197, 0.09)", filter: "blur(18px)", pointerEvents: "none" }} />
              <Image src="/brand/logo.png" alt="The Raki" width={192} height={136} style={{ filter: "brightness(10)", opacity: 0.78, marginBottom: "var(--space-lg)" }} />
              <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>Пока без позиций</span>
              <h2 className="text-h2" style={{ marginBottom: "var(--space-sm)", maxWidth: 620, lineHeight: 1.04 }}>
                Сначала стол. Здесь — тихая финальная сверка.
              </h2>
              <p className="text-muted" style={{ fontSize: 16, lineHeight: 1.8, maxWidth: 620, marginBottom: "var(--space-lg)" }}>
                Корзина нужна для одной вещи: без спешки проверить состав, сервис и сумму перед подтверждением заказа.
              </p>
              <div className="flex" style={{ gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-xl)" }}>
                <Link href={menuHref} className="cta cta--primary">Открыть каталог</Link>
                <Link href={contextHref} className="cta cta--ghost">Уточнить обслуживание</Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--space-xs)" }}>
                {EMPTY_CART_HIGHLIGHTS.map((item) => (
                  <div key={item.label} style={{ padding: "14px 0 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-eyebrow block" style={{ marginBottom: 6 }}>{item.label}</span>
                    <div className="text-muted" style={{ lineHeight: 1.7 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "calc(var(--space-xl) + 4px)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", backgroundColor: "rgba(10, 18, 24, 0.84)", display: "grid", gap: "var(--space-sm)", alignContent: "start" }}>
              <div style={{ paddingBottom: "var(--space-sm)", borderBottom: "1px solid var(--border)" }}>
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>Как собирают заказ</span>
                <strong style={{ display: "block", fontSize: 22, lineHeight: 1.18 }}>Сначала стол, потом адрес и контакт.</strong>
              </div>
              {EMPTY_CART_START_POINTS.map((item, index) => (
                <div key={item.title} style={{ display: "grid", gridTemplateColumns: "40px minmax(0, 1fr)", gap: "var(--space-sm)", padding: "var(--space-md) 0", borderBottom: index === EMPTY_CART_START_POINTS.length - 1 ? "none" : "1px solid var(--border)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(99, 188, 197, 0.26)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>0{index + 1}</div>
                  <div>
                    <strong style={{ display: "block", fontSize: 16, marginBottom: 4 }}>{item.title}</strong>
                    <div className="text-muted" style={{ lineHeight: 1.7 }}>{item.note}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: "var(--space-sm)", paddingTop: "var(--space-md)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>Сейчас по сервису</span>
                <div className="text-muted" style={{ lineHeight: 1.7 }}>
                  <div>{getFulfillmentLabel(draft.fulfillmentMode)}</div>
                  <div>{serviceLabel}</div>
                  <div>{timingLabel}</div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      ) : (
        <div className="flex" style={{ gap: "var(--space-xl)", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 0" }}>
            <AnimatePresence mode="popLayout">
              {cart.lineItems.map((item, index) => (
                <motion.article
                  key={`${item.itemId}-${index}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.28 }}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-md)", marginBottom: "var(--space-sm)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{item.itemName}</h3>
                    {item.summaryLines.length > 0 ? (
                      <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.65 }}>
                        {item.summaryLines.join(" • ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center" style={{ gap: 0, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                    <button type="button" onClick={() => handleDecrement(index)} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", fontSize: 18 }}>-</button>
                    <motion.span key={item.quantity} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} style={{ width: 36, textAlign: "center", fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {item.quantity}
                    </motion.span>
                    <button type="button" onClick={() => handleIncrement(index)} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", fontSize: 18 }}>+</button>
                  </div>

                  <motion.span key={item.totalPrice} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 110, textAlign: "right" }}>
                    {formatMoney(item.totalPrice)}
                  </motion.span>

                  <button type="button" onClick={() => handleRemove(index)} style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-dim)", fontSize: 18, borderRadius: "var(--radius-sm)" }}>
                    ×
                  </button>
                </motion.article>
              ))}
            </AnimatePresence>

            {upsellItems.length > 0 ? (
              <ScrollReveal delay={0.06}>
                <section style={{ marginTop: "var(--space-lg)", marginBottom: "var(--space-lg)" }}>
                  <div
                    className="flex items-end justify-between"
                    style={{ gap: "var(--space-md)", marginBottom: "var(--space-sm)", flexWrap: "wrap" }}
                  >
                    <div>
                      <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                        К заказу часто добавляют
                      </span>
                      <h2 style={{ fontSize: 28, lineHeight: 1.08 }}>
                        Можно добавить к заказу.
                      </h2>
                    </div>
                    <div className="text-muted" style={{ maxWidth: 360, lineHeight: 1.75 }}>
                      Аккуратные соседние позиции, которые усиливают заказ и не спорят с основным выбором.
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "var(--space-sm)",
                    }}
                  >
                    {upsellItems.map((entry) => (
                      <article
                        key={entry.item.id}
                        style={{
                          overflow: "hidden",
                          borderRadius: "var(--radius-xl)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(15, 26, 34, 0.88) 100%)",
                        }}
                      >
                        <div
                          style={{
                            height: 188,
                            backgroundImage: `linear-gradient(180deg, rgba(8,16,20,0.08) 0%, rgba(8,16,20,0.5) 100%), url("${getProductFamilyImage(entry.item.productFamily)}")`,
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
                              lineHeight: 1.14,
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
                    ))}
                  </div>
                </section>
              </ScrollReveal>
            ) : null}

            <ScrollReveal delay={0.08}>
              <div
                style={{
                  marginTop: "var(--space-lg)",
                  display: "grid",
                  gridTemplateColumns: "1.15fr 0.9fr",
                  gap: "var(--space-sm)",
                }}
              >
                <div
                  style={{
                    padding: "calc(var(--space-lg) + 2px)",
                    borderRadius: "var(--radius-xl)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    background:
                      "radial-gradient(circle at top left, rgba(99, 188, 197, 0.1) 0%, rgba(99, 188, 197, 0) 48%), rgba(15, 26, 34, 0.72)",
                  }}
                >
                  <span className="text-eyebrow block" style={{ marginBottom: 8 }}>
                    После сверки
                  </span>
                  <strong style={{ display: "block", fontSize: 24, lineHeight: 1.16, marginBottom: "var(--space-sm)" }}>
                    Команда подтверждает контакт, окно и окончательную передачу без лишней спешки.
                  </strong>
                  <div className="text-muted" style={{ lineHeight: 1.8, maxWidth: 560 }}>
                    После этого шага остаётся только подтвердить телефон, удобный способ оплаты и дождаться спокойного звонка команды.
                  </div>
                </div>

                <div
                  style={{
                    padding: "calc(var(--space-lg) + 2px)",
                    borderRadius: "var(--radius-xl)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    backgroundColor: "rgba(10, 18, 24, 0.82)",
                    display: "grid",
                    gap: "var(--space-sm)",
                    alignContent: "start",
                  }}
                >
                  <div style={{ paddingBottom: "var(--space-sm)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                      По текущему сервису
                    </span>
                    <strong style={{ display: "block", fontSize: 18 }}>{serviceLabel}</strong>
                  </div>

                  <div className="text-muted" style={{ lineHeight: 1.75, display: "grid", gap: 4 }}>
                    <div>{getFulfillmentLabel(draft.fulfillmentMode)}</div>
                    <div>{timingLabel}</div>
                    <div>
                      {cart.state === "ready"
                        ? "Состав уже можно передавать команде."
                        : cart.state === "below-minimum"
                          ? "Нужно немного добрать сумму до сервисного минимума."
                          : "Часть позиций стоит перепроверить после смены адреса или точки выдачи."}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          <div
            style={{
              width: 360,
              flexShrink: 0,
              position: "sticky",
              top: 108,
              alignSelf: "flex-start",
              padding: "18px 18px 20px",
              borderRadius: "var(--radius-xl)",
              border: "1px solid rgba(255,255,255,0.07)",
              background:
                "linear-gradient(180deg, rgba(15, 26, 34, 0.96) 0%, rgba(10, 18, 24, 0.9) 100%)",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.18)",
              backdropFilter: "blur(16px)",
            }}
          >
            <h3 className="text-eyebrow" style={{ marginBottom: "var(--space-md)", color: "var(--text-muted)" }}>Сверка</h3>
            <div className="flex justify-between" style={{ marginBottom: "var(--space-sm)", fontSize: 15 }}>
              <span className="text-muted">Товары</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{cart.subtotalLabel}</span>
            </div>
            {draft.fulfillmentMode === "delivery" ? (
              <div className="flex justify-between" style={{ marginBottom: "var(--space-sm)", fontSize: 15 }}>
                <span className="text-muted">Доставка</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{cart.fee > 0 ? formatMoney(cart.fee) : "Уточняется"}</span>
              </div>
            ) : null}
            <div className="flex justify-between" style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-sm)", marginTop: "var(--space-sm)", marginBottom: "var(--space-lg)" }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>К оплате</span>
              <motion.span key={cart.total} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{cart.totalLabel}</motion.span>
            </div>
            <div
              style={{
                padding: "var(--space-md)",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                marginBottom: "var(--space-lg)",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "rgba(255,255,255,0.025)",
              }}
            >
              <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.7, display: "grid", gap: 4 }}>
                <span>{getFulfillmentLabel(draft.fulfillmentMode)}</span>
                <span>{serviceLabel}</span>
                <span>{timingLabel}</span>
                <span>Оплата после подтверждения и получения.</span>
              </div>
            </div>
            <Link href="/checkout" className="cta cta--primary" style={{ width: "100%", display: "flex", marginBottom: "var(--space-sm)" }}>
              Перейти к контакту
            </Link>
            <div className="flex" style={{ gap: "var(--space-xs)" }}>
              <Link href={menuHref} className="cta cta--ghost" style={{ flex: 1, justifyContent: "center" }}>В каталог</Link>
              <Link href={contextHref} className="cta cta--ghost" style={{ flex: 1, justifyContent: "center" }}>Изменить сервис</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

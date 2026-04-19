"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useDraft } from "@/components/draft-provider";
import { ScrollReveal } from "@/components/scroll-reveal";
import { useFakeAuth } from "@/hooks/use-fake-auth";
import { isValidRuPhone, normalizeRuPhone } from "@/lib/checkout";
import { getProductFamilyImage } from "@/lib/category-images";
import { getDraftCartView, hasResolvedServiceContext } from "@/lib/draft-view";
import { formatMoney, getMenuSnapshotForContext, type MenuSnapshotItem } from "@/lib/fixtures";
import {
  appendDraftLineItem,
  buildDraftLineItem,
  getDefaultModifierSelections,
} from "@/lib/line-item";
import type { SubmitOrderResponse, SubmittedOrderSummary } from "@/lib/orders";
import { getContextUpsellItems, getUpsellNote } from "@/lib/upsells";

const PAYMENT_OPTIONS = [
  {
    id: "cash_on_receipt" as const,
    label: "Наличными при получении",
    note: "Курьеру или на точке выдачи",
  },
  {
    id: "online_card" as const,
    label: "Картой при получении",
    note: "Через терминал или ссылку от команды",
  },
  {
    id: "sbp" as const,
    label: "Переводом после звонка",
    note: "Для чувствительных маршрутов и крупных заказов",
  },
] as const;

const READY_ITEMS = [
  "Имя и телефон для подтверждения.",
  "Подтвержденный адрес доставки или точка самовывоза.",
  "Собранный заказ в корзине.",
] as const;

const cardStyle = {
  borderRadius: "var(--radius-xl)",
  border: "1px solid var(--border)",
  backgroundColor: "rgba(10, 18, 24, 0.84)",
} as const;

function getServiceModeLabel(mode: string | null) {
  if (mode === "pickup") return "Самовывоз";
  if (mode === "delivery") return "Доставка";
  return "Уточняется";
}

function getHandoffStatusLabel(order: SubmittedOrderSummary) {
  if (order.handoffStatus === "submitted") return "передан в систему";
  if (order.handoffStatus === "sync_failed") return "на ручной проверке";
  return "принят командой";
}

function HeroCard({
  eyebrow,
  title,
  body,
  actions,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: "calc(var(--space-2xl) + 6px)",
        background:
          "radial-gradient(circle at top left, rgba(99, 188, 197, 0.12) 0%, rgba(99, 188, 197, 0) 44%), rgba(15, 26, 34, 0.84)",
      }}
    >
      <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
        {eyebrow}
      </span>
      <h1 className="text-h1" style={{ marginBottom: "var(--space-sm)", maxWidth: 640 }}>
        {title}
      </h1>
      <p
        className="text-muted"
        style={{ marginBottom: actions ? "var(--space-lg)" : 0, lineHeight: 1.8, maxWidth: 620 }}
      >
        {body}
      </p>
      {actions}
    </div>
  );
}

function SideInfo({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: "calc(var(--space-xl) + 4px)",
        display: "grid",
        gap: "var(--space-sm)",
        alignContent: "start",
      }}
    >
      <div style={{ paddingBottom: "var(--space-sm)", borderBottom: "1px solid var(--border)" }}>
        <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
          {subtitle}
        </span>
        <strong style={{ display: "block", fontSize: 22, lineHeight: 1.2 }}>{title}</strong>
      </div>
      {children}
    </div>
  );
}

function SummaryMetric({
  eyebrow,
  title,
  lines,
}: {
  eyebrow: string;
  title: string;
  lines: string[];
}) {
  return (
    <div
      style={{
        padding: "var(--space-md)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(255,255,255,0.07)",
        backgroundColor: "rgba(255,255,255,0.025)",
      }}
    >
      <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
        {eyebrow}
      </span>
      <strong style={{ display: "block", fontSize: 18, marginBottom: 8 }}>{title}</strong>
      <div className="text-muted" style={{ lineHeight: 1.7, display: "grid", gap: 4 }}>
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

export function CheckoutPage() {
  const { draft, patchDraft } = useDraft();
  const cart = getDraftCartView(draft);
  const serviceResolved = hasResolvedServiceContext(draft);
  const contextHref = draft.fulfillmentMode === "pickup" ? "/pickup/points" : "/delivery/address";
  const menuHref = draft.fulfillmentMode === "pickup" ? "/menu?fulfillment=pickup" : "/menu?fulfillment=delivery";

  const [name, setName] = useState(draft.customerName);
  const [phone, setPhone] = useState(draft.customerPhone);
  const [comment, setComment] = useState(draft.customerComment);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_OPTIONS)[number]["id"]>(
    draft.paymentMethod ?? "cash_on_receipt",
  );
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrderSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { hydrated: authHydrated, lookup: lookupAuth, login: loginAuth } = useFakeAuth();

  useEffect(() => {
    setName(draft.customerName);
  }, [draft.customerName]);

  useEffect(() => {
    setPhone(draft.customerPhone);
  }, [draft.customerPhone]);

  useEffect(() => {
    setComment(draft.customerComment);
  }, [draft.customerComment]);

  useEffect(() => {
    setPaymentMethod(draft.paymentMethod ?? "cash_on_receipt");
  }, [draft.paymentMethod]);

  const phoneValid = isValidRuPhone(phone);
  const canSubmit =
    name.trim().length > 0 && phoneValid && cart.lineItems.length > 0 && !submitting;

  // Fake-auth lookup: if the typed phone matches a stored entry, show
  // "welcome back" with bonus balance. Otherwise greet as first-time.
  const normalizedPhone = phoneValid ? normalizeRuPhone(phone) : null;
  const knownAuth =
    authHydrated && normalizedPhone ? lookupAuth(normalizedPhone) : null;
  const phoneLookupMessage = !authHydrated || !phoneValid
    ? null
    : knownAuth
      ? `С возвращением${knownAuth.name ? `, ${knownAuth.name}` : ""}. На вашем счету: ${knownAuth.bonusBalance.toLocaleString("ru-RU")} ₽ бонусов.`
      : "Это ваш первый заказ — зарегистрируем вас при оформлении.";
  const serviceLabel =
    cart.serviceLabel ||
    (draft.fulfillmentMode === "pickup"
      ? "Точку выдачи уточним перед подтверждением"
      : "Адрес уточним перед подтверждением");
  const timingLabel =
    cart.serviceTimingLabel ||
    cart.etaLabel ||
    (draft.fulfillmentMode === "pickup"
      ? "Окно выдачи подтвердим после точки"
      : "Время подтвердим после адреса");

  const snapshot = useMemo(
    () =>
      getMenuSnapshotForContext({
        fulfillmentMode: draft.fulfillmentMode ?? "delivery",
        locationId: draft.locationId,
        servicePointId: draft.servicePointId,
      }),
    [draft.fulfillmentMode, draft.locationId, draft.servicePointId],
  );
  const checkoutUpsellItems = useMemo(
    () =>
      getContextUpsellItems({
        visibleItems: snapshot.visibleItems,
        excludedItemIds: cart.lineItems.map((item) => item.itemId),
        anchorFamilies: snapshot.visibleItems
          .filter((entry) => cart.lineItems.some((item) => item.itemId === entry.item.id))
          .map((entry) => entry.item.productFamily),
        limit: 2,
      }),
    [cart.lineItems, snapshot.visibleItems],
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
        orderStage: "checkout",
      });
    },
    [draft.lineItems, patchDraft],
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    const nextDraft = {
      ...draft,
      customerName: name.trim(),
      customerPhone: normalizeRuPhone(phone),
      customerComment: comment.trim(),
      paymentMethod,
      orderStage: "pending_ack" as const,
    };
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/orders/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: nextDraft }),
      });
      const payload = (await response.json()) as SubmitOrderResponse & {
        error?: { message?: string };
      };

      if (!response.ok || !payload.order) {
        throw new Error(payload.error?.message || "Не удалось передать заказ команде.");
      }

      patchDraft({
        customerName: nextDraft.customerName,
        customerPhone: nextDraft.customerPhone,
        customerComment: nextDraft.customerComment,
        paymentMethod,
        orderStage: "accepted",
      });
      setSubmittedOrder(payload.order);
      // Fake auth: record the phone as a known customer after a successful
      // order so future visits greet them by name/bonus balance.
      loginAuth(nextDraft.customerPhone);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Не удалось передать заказ команде.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, comment, draft, loginAuth, name, patchDraft, paymentMethod, phone]);

  if (cart.lineItems.length === 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          maxWidth: 1240,
          margin: "0 auto",
          padding: "132px var(--space-lg) var(--space-lg)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.08fr) minmax(320px, 0.9fr)",
            gap: "var(--space-sm)",
            alignItems: "stretch",
          }}
        >
          <HeroCard
            eyebrow="Оформление"
            title="Здесь подтверждаем контакт и передаем заказ команде."
            body="Сначала соберите заказ, затем вернитесь сюда для контакта, оплаты и финального подтверждения."
            actions={
              <div className="flex" style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}>
                <Link href={menuHref} className="cta cta--primary">
                  Открыть каталог
                </Link>
                <Link href={contextHref} className="cta cta--ghost">
                  Уточнить адрес
                </Link>
              </div>
            }
          />

          <SideInfo
            title="Перед этим шагом проверяем три вещи"
            subtitle="Что нужно перед этим шагом"
          >
            {READY_ITEMS.map((item, index) => (
              <div
                key={item}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px minmax(0, 1fr)",
                  gap: "var(--space-sm)",
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "1px solid rgba(99, 188, 197, 0.26)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  0{index + 1}
                </div>
                <div className="text-muted" style={{ paddingTop: 7, lineHeight: 1.7 }}>
                  {item}
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: "var(--space-sm)",
                paddingTop: "var(--space-md)",
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                Сейчас по сервису
              </span>
              <div className="text-muted" style={{ lineHeight: 1.7 }}>
                <div>{getServiceModeLabel(draft.fulfillmentMode)}</div>
                <div>{serviceLabel}</div>
                <div>{timingLabel}</div>
              </div>
            </div>
          </SideInfo>
        </div>
      </div>
    );
  }

  if (!serviceResolved) {
    return (
      <div
        style={{
          minHeight: "100vh",
          maxWidth: 1240,
          margin: "0 auto",
          padding: "132px var(--space-lg) var(--space-lg)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.08fr) minmax(320px, 0.9fr)",
            gap: "var(--space-sm)",
            alignItems: "stretch",
          }}
        >
          <HeroCard
            eyebrow="Оформление"
            title="Сначала закрепим адрес или точку выдачи."
            body="Сумма, доступность позиций и время должны опираться на реальный сервис, а не на предположение."
            actions={
              <div className="flex" style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}>
                <Link href={contextHref} className="cta cta--primary">
                  Уточнить адрес
                </Link>
                <Link href="/cart" className="cta cta--ghost">
                  Вернуться в заказ
                </Link>
              </div>
            }
          />

          <SideInfo title="Состав, стоимость и время уже привязаны к сервису" subtitle="По вашему заказу">
            <div className="text-muted" style={{ lineHeight: 1.8, display: "grid", gap: 10 }}>
              <div>Проверяем, какие позиции можно подтвердить именно сейчас.</div>
              <div>Считаем честное окно доставки или выдачи без лишних обещаний.</div>
              <div>Сумма уже учитывает текущий сервис, маршрут и окно обслуживания.</div>
            </div>
            <div
              style={{
                marginTop: "var(--space-sm)",
                paddingTop: "var(--space-md)",
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                Сейчас по сервису
              </span>
              <div className="text-muted" style={{ lineHeight: 1.7 }}>
                <div>{getServiceModeLabel(draft.fulfillmentMode)}</div>
                <div>{serviceLabel}</div>
                <div>{timingLabel}</div>
              </div>
            </div>
          </SideInfo>
        </div>
      </div>
    );
  }

  if (submittedOrder) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "100vh", padding: "var(--space-lg)" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            maxWidth: 980,
            width: "100%",
            padding: "calc(var(--space-2xl) + 6px)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)",
            background:
              "linear-gradient(180deg, rgba(99, 188, 197, 0.08) 0%, rgba(15, 26, 34, 0.9) 100%)",
            display: "grid",
            gap: "var(--space-xl)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(260px, 0.74fr)",
              gap: "var(--space-lg)",
              alignItems: "start",
            }}
          >
            <div>
              <motion.div
                initial={{ scale: 0.86, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.12, duration: 0.38 }}
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "var(--space-lg)",
                  fontSize: 36,
                  color: "var(--bg)",
                  boxShadow: "0 0 24px rgba(99, 188, 197, 0.28)",
                }}
              >
                ✓
              </motion.div>

              <span className="text-eyebrow" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
                Заказ принят
              </span>
              <h1 className="text-h1" style={{ marginBottom: "var(--space-sm)", maxWidth: 620 }}>
                Заказ {submittedOrder.reference} принят.
              </h1>
              <p
                className="text-muted"
                style={{ fontSize: 16, lineHeight: 1.75, maxWidth: 620 }}
              >
                Команда уже получила заявку. Уточним детали, финальное время и способ передачи по подтвержденному адресу или точке выдачи.
              </p>
            </div>

            <div
              style={{
                padding: "18px 0 0",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "grid",
                gap: "var(--space-sm)",
                alignContent: "start",
              }}
            >
              <span className="text-eyebrow block">Передача</span>
              <strong style={{ display: "block", fontSize: 22, lineHeight: 1.2 }}>
                {submittedOrder.handoffLabel}
              </strong>
              <div className="text-muted" style={{ lineHeight: 1.75, display: "grid", gap: 6 }}>
                <div>{getHandoffStatusLabel(submittedOrder)}</div>
                <div>{submittedOrder.externalReference ? `Внешний id: ${submittedOrder.externalReference}` : `К оплате: ${submittedOrder.totalLabel}`}</div>
                <div>{submittedOrder.guestLabel}</div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "var(--space-sm)",
            }}
          >
            <SummaryMetric
              eyebrow="Сервис"
              title={submittedOrder.fulfillmentLabel}
              lines={[submittedOrder.serviceLabel, timingLabel]}
            />
            <SummaryMetric
              eyebrow="Передача"
              title={submittedOrder.handoffLabel}
              lines={[
                getHandoffStatusLabel(submittedOrder),
                submittedOrder.externalReference
                  ? `Внешний id: ${submittedOrder.externalReference}`
                  : `К оплате: ${submittedOrder.totalLabel}`,
              ]}
            />
            <SummaryMetric
              eyebrow="Гость"
              title={submittedOrder.guestLabel}
              lines={[phone, `${submittedOrder.lineCount} поз. в заказе`]}
            />
          </div>

          <div
            className="flex justify-center"
            style={{
              gap: "var(--space-sm)",
              flexWrap: "wrap",
              paddingTop: "var(--space-lg)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {submittedOrder.trackingHref ? (
              <Link href={submittedOrder.trackingHref} className="cta cta--primary">
                Отслеживать доставку
              </Link>
            ) : null}
            <Link href={menuHref} className="cta cta--ghost">
              Вернуться в каталог
            </Link>
            <Link href="/" className="cta cta--ghost">
              На главную
            </Link>
          </div>

          <div className="flex justify-center" style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}>
            <a href="tel:+79808880588" className="cta cta--ghost">
              Позвонить команде
            </a>
            <a href="https://t.me/The_raki" className="cta cta--ghost" rel="noreferrer" target="_blank">
              Telegram
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", maxWidth: 1320, margin: "0 auto", padding: "108px var(--space-lg) var(--space-xl)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          gap: "var(--space-xl)",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "grid", gap: "var(--space-lg)" }}>
          <ScrollReveal>
            <div
              style={{
                ...cardStyle,
                padding: "calc(var(--space-xl) + 8px)",
                background:
                  "radial-gradient(circle at top left, rgba(99, 188, 197, 0.08) 0%, rgba(99, 188, 197, 0) 38%), rgba(15, 26, 34, 0.74)",
              }}
            >
              <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
                Оформление
              </span>
              <h1 className="text-h1" style={{ marginBottom: "var(--space-sm)", maxWidth: 760 }}>
                Последний шаг перед подтверждением.
              </h1>
              <p
                className="text-muted"
                style={{ fontSize: 16, maxWidth: 760, lineHeight: 1.8, marginBottom: "var(--space-lg)" }}
              >
                Проверьте контакт, выберите удобный способ оплаты и мы спокойно передадим заказ
                команде без лишних звонков и повторных уточнений.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "var(--space-lg)",
                }}
              >
                <div
                  style={{
                    paddingTop: "var(--space-md)",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <span className="text-eyebrow">Подача</span>
                  <strong style={{ display: "block", fontSize: 24, lineHeight: 1.18 }}>
                    {serviceLabel}
                  </strong>
                  <div className="text-muted" style={{ lineHeight: 1.75 }}>
                    <div>{getServiceModeLabel(draft.fulfillmentMode)}</div>
                    <div>{timingLabel}</div>
                  </div>
                </div>
                <div
                  style={{
                    paddingTop: "var(--space-md)",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <span className="text-eyebrow">Оплата</span>
                  <strong style={{ display: "block", fontSize: 24, lineHeight: 1.18 }}>
                    После подтверждения
                  </strong>
                  <div className="text-muted" style={{ lineHeight: 1.75 }}>
                    <div>Наличными, картой или переводом.</div>
                    <div>Финальный вариант фиксируем перед передачей заказа.</div>
                  </div>
                </div>
                <div
                  style={{
                    paddingTop: "var(--space-md)",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <span className="text-eyebrow">Сумма</span>
                  <strong style={{ display: "block", fontSize: 24, lineHeight: 1.18 }}>
                    {cart.totalLabel}
                  </strong>
                  <div className="text-muted" style={{ lineHeight: 1.75 }}>
                    <div>{cart.lineCount} позиций в заказе.</div>
                    <div>После подтверждения команда сразу собирает заказ и выходит на связь.</div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <div
              style={{
                padding: "var(--space-xl)",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--border)",
                background:
                  "linear-gradient(180deg, rgba(15, 26, 34, 0.74) 0%, rgba(10, 18, 24, 0.88) 100%)",
                backdropFilter: "blur(16px)",
              }}
            >
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                  Контакт для подтверждения
                </span>
                <div className="text-muted" style={{ lineHeight: 1.7, maxWidth: 640 }}>
                  По этим данным подтверждаем окно, оплату и аккуратную передачу заказа без лишней суеты.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "var(--space-md)",
                  marginBottom: "var(--space-lg)",
                }}
              >
                <div>
                  <label className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)", color: "var(--text-muted)" }}>
                    Имя
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Как к вам обращаться"
                    style={{
                      width: "100%",
                      padding: "14px 18px",
                      backgroundColor: "var(--bg)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: 16,
                    }}
                  />
                </div>

                <div>
                  <label className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)", color: "var(--text-muted)" }}>
                    Телефон
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+7 (___) ___-__-__"
                      style={{
                        width: "100%",
                        padding: "14px 18px",
                        paddingRight: 48,
                        backgroundColor: "var(--bg)",
                        color: "var(--text-primary)",
                        border: `1px solid ${phone.length > 3 ? (phoneValid ? "var(--accent)" : "var(--border)") : "var(--border)"}`,
                        borderRadius: "var(--radius-md)",
                        fontSize: 16,
                      }}
                    />
                    <AnimatePresence>
                      {phoneValid ? (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          style={{
                            position: "absolute",
                            right: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--accent)",
                            fontSize: 20,
                          }}
                        >
                          ✓
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>
                  {phoneLookupMessage ? (
                    <p
                      style={{
                        marginTop: "var(--space-xs)",
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: knownAuth ? "var(--accent)" : "var(--text-muted)",
                      }}
                    >
                      {phoneLookupMessage}
                    </p>
                  ) : null}
                </div>
              </div>

              <div style={{ marginBottom: "var(--space-lg)" }}>
                <label className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)", color: "var(--text-muted)" }}>
                  Комментарий
                </label>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Подъезд, звонок, Telegram, пожелания по выдаче"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    backgroundColor: "var(--bg)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 16,
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ marginBottom: "var(--space-xl)" }}>
                <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)", color: "var(--text-muted)" }}>
                  Предпочтительный способ оплаты
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "var(--space-xs)",
                  }}
                >
                  {PAYMENT_OPTIONS.map((option) => {
                    const active = option.id === paymentMethod;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPaymentMethod(option.id)}
                        style={{
                          textAlign: "left",
                          padding: "var(--space-md)",
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                          backgroundColor: active ? "rgba(99, 188, 197, 0.08)" : "var(--bg)",
                          cursor: "pointer",
                        }}
                      >
                        <strong style={{ display: "block", marginBottom: 6 }}>{option.label}</strong>
                        <span className="text-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                          {option.note}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {checkoutUpsellItems.length > 0 ? (
                <div style={{ marginBottom: "var(--space-xl)" }}>
                  <div style={{ marginBottom: "var(--space-sm)" }}>
                    <span className="text-eyebrow block" style={{ marginBottom: 6, color: "var(--text-muted)" }}>
                      Перед подтверждением
                    </span>
                    <strong style={{ display: "block", fontSize: 22, lineHeight: 1.2 }}>
                      Можно добавить к заказу.
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "var(--space-sm)",
                    }}
                  >
                    {checkoutUpsellItems.map((entry) => (
                      <article
                        key={entry.item.id}
                        style={{
                          overflow: "hidden",
                          borderRadius: "var(--radius-lg)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          backgroundColor: "rgba(255,255,255,0.025)",
                        }}
                      >
                        <div
                          style={{
                            height: 120,
                            backgroundImage: `linear-gradient(180deg, rgba(8,16,20,0.08) 0%, rgba(8,16,20,0.52) 100%), url("${getProductFamilyImage(entry.item.productFamily)}")`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        <div style={{ padding: "var(--space-md)" }}>
                          <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                            {entry.item.category}
                          </span>
                          <strong
                            style={{
                              display: "block",
                              fontSize: 18,
                              lineHeight: 1.18,
                              marginBottom: 8,
                              fontFamily: "var(--font-display), serif",
                            }}
                          >
                            {entry.item.name}
                          </strong>
                          <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.7, marginBottom: "var(--space-sm)" }}>
                            {getUpsellNote(entry)}
                          </div>
                          <div
                            className="flex items-center justify-between"
                            style={{ gap: "var(--space-xs)", flexWrap: "wrap" }}
                          >
                            <strong style={{ fontSize: 18 }}>{formatMoney(entry.effectiveBasePrice)}</strong>
                            <button
                              type="button"
                              className="cta cta--ghost"
                              style={{ padding: "10px 14px" }}
                              onClick={() => handleUpsellAdd(entry)}
                            >
                              В заказ
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {submitError ? (
                <div
                  style={{
                    marginBottom: "var(--space-lg)",
                    padding: "var(--space-md)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid rgba(255, 118, 118, 0.22)",
                    backgroundColor: "rgba(110, 24, 24, 0.26)",
                    color: "var(--text-primary)",
                  }}
                >
                  {submitError}
                </div>
              ) : null}

              <div className="flex" style={{ gap: "var(--space-sm)" }}>
                <button
                  type="button"
                  className="cta cta--primary"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  style={{
                    flex: 1,
                    opacity: canSubmit ? 1 : 0.5,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                  }}
                >
                  {submitting ? "Сохраняем заявку..." : "Передать заказ команде"}
                </button>
                <Link href="/cart" className="cta cta--ghost">
                  Назад в заказ
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.05}>
          <aside
            style={{
              width: 360,
              position: "sticky",
              top: 108,
              display: "grid",
              gap: "var(--space-xs)",
            }}
          >
            <div
              style={{
                padding: "22px 20px 22px",
                borderRadius: "var(--radius-xl)",
                border: "1px solid rgba(255,255,255,0.07)",
                background:
                  "radial-gradient(circle at top left, rgba(99, 188, 197, 0.1) 0%, rgba(99, 188, 197, 0) 44%), linear-gradient(180deg, rgba(15, 26, 34, 0.96) 0%, rgba(10, 18, 24, 0.9) 100%)",
                boxShadow: "0 24px 64px rgba(0, 0, 0, 0.18)",
                backdropFilter: "blur(16px)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: "var(--space-sm)",
                  marginBottom: "var(--space-lg)",
                  paddingBottom: "var(--space-md)",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="flex justify-between"
                  style={{ gap: "var(--space-sm)", alignItems: "flex-start" }}
                >
                  <div>
                    <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                      Ваш заказ
                    </span>
                    <strong
                      className="font-display"
                      style={{ display: "block", fontSize: 40, lineHeight: 0.98 }}
                    >
                      {cart.totalLabel}
                    </strong>
                  </div>
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-full)",
                      border: "1px solid rgba(99, 188, 197, 0.18)",
                      backgroundColor: "rgba(99, 188, 197, 0.06)",
                      color: "var(--accent)",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cart.lineCount} поз.
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "var(--space-2xs)",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backgroundColor: "rgba(255,255,255,0.025)",
                  }}
                >
                  <span className="text-eyebrow">Сервис</span>
                  <strong style={{ fontSize: 16, lineHeight: 1.35 }}>{serviceLabel}</strong>
                  <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
                    <div>{getServiceModeLabel(draft.fulfillmentMode)}</div>
                    <div>{timingLabel}</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "var(--space-xs)",
                  paddingBottom: "var(--space-md)",
                  marginBottom: "var(--space-md)",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {cart.lineItems.map((item, index) => (
                  <div
                    key={`${item.itemId}-${index}`}
                    className="flex justify-between"
                    style={{ gap: "var(--space-sm)", fontSize: 14 }}
                  >
                    <span className="text-muted" style={{ flex: 1 }}>
                      {item.itemName} × {item.quantity}
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatMoney(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between" style={{ marginTop: "var(--space-sm)", fontSize: 15 }}>
                <span className="text-muted">Товары</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{cart.subtotalLabel}</span>
              </div>

              {draft.fulfillmentMode === "delivery" ? (
                <div className="flex justify-between" style={{ marginTop: "var(--space-sm)", fontSize: 15 }}>
                  <span className="text-muted">Доставка</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {cart.fee > 0 ? formatMoney(cart.fee) : "Уточняется"}
                  </span>
                </div>
              ) : null}

              <div
                className="flex justify-between"
                style={{
                  marginTop: "var(--space-md)",
                  paddingTop: "var(--space-sm)",
                  borderTop: "1px solid var(--border)",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                <span>К оплате</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{cart.totalLabel}</span>
              </div>
            </div>

            <div
              style={{
                padding: "16px 18px",
                borderRadius: "var(--radius-xl)",
                border: "1px solid rgba(255,255,255,0.07)",
                backgroundColor: "rgba(12, 22, 28, 0.82)",
              }}
            >
              <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                По заказу
              </span>
              <div
                className="text-muted"
                style={{ fontSize: 13, lineHeight: 1.72, display: "grid", gap: 4 }}
              >
                <span>{serviceLabel}</span>
                <span>Способ оплаты и окно подтверждаем перед передачей заказа.</span>
                <span>После этого команда сразу собирает подачу и выходит на связь.</span>
              </div>
            </div>
          </aside>
        </ScrollReveal>
      </div>
    </div>
  );
}

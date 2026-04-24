"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { dispatchCartOpen } from "@/components/cart-events";
import { useDraft } from "@/components/draft-provider";
import { ScrollReveal } from "@/components/scroll-reveal";
import { useFakeAuth } from "@/hooks/use-fake-auth";
import { getCheckoutIssues, isValidRuPhone, normalizeRuPhone } from "@/lib/checkout";
import { getProductFamilyImage } from "@/lib/category-images";
import { getDraftCartView, hasResolvedServiceContext } from "@/lib/draft-view";
import { formatMoney, getMenuSnapshotForContext, type MenuSnapshotItem } from "@/lib/fixtures";
import {
  appendDraftLineItem,
  buildDraftLineItem,
  getDefaultModifierSelections,
  type DraftLineItem,
} from "@/lib/line-item";
import type { SubmitOrderResponse, SubmittedOrderSummary } from "@/lib/orders";
import { getContextUpsellItems, getUpsellNote } from "@/lib/upsells";

type ModifierRow = {
  label: string;
  value: string;
};

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
    note: "Для крупных столов и чувствительных маршрутов",
  },
] as const;

const READY_ITEMS = [
  "Имя и телефон для подтверждения.",
  "Подтвержденный адрес доставки или точка самовывоза.",
  "Собранный заказ в вашем столе.",
] as const;

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

function getServiceModeLabel(mode: string | null) {
  if (mode === "pickup") return "Самовывоз";
  if (mode === "delivery") return "Доставка";
  return "Сервис";
}

function getHandoffStatusLabel(order: SubmittedOrderSummary) {
  if (order.handoffStatus === "submitted") return "Передан в систему";
  if (order.handoffStatus === "sync_failed") return "На ручной проверке";
  return "Принят командой";
}

function getContextHref(fulfillmentMode: string | null) {
  return fulfillmentMode === "pickup" ? "/pickup/points" : "/delivery/address";
}

function getIssueLabel(count: number) {
  if (count <= 0) return null;

  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `Проверим ${count} позицию перед подтверждением`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `Проверим ${count} позиции перед подтверждением`;
  }

  return `Проверим ${count} позиций перед подтверждением`;
}

function getLineProductImage(
  lineItem: DraftLineItem,
  visibleItems: ReturnType<typeof getMenuSnapshotForContext>["visibleItems"],
) {
  const family =
    visibleItems.find((entry) => entry.item.id === lineItem.itemId)?.item.productFamily ?? "boiled";

  return getProductFamilyImage(family);
}

function CheckoutControls({
  contextHref,
  lineCount,
  showOrderButton = true,
}: {
  contextHref: string;
  lineCount: number;
  showOrderButton?: boolean;
}) {
  return (
    <div className="menu-editorial__controls product-editorial__controls checkout-editorial__controls">
      <Link href="/menu-editorial" className="menu-editorial__control menu-editorial__control--menu">
        <span className="product-editorial__back-arrow" aria-hidden>
          ←
        </span>
        <span>Меню</span>
      </Link>

      <div className="menu-editorial__control-stack">
        <Link href={contextHref} className="menu-editorial__icon-control" aria-label="Адрес и подача">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 20s6-5.1 6-10.2A6 6 0 0 0 6 9.8C6 14.9 12 20 12 20Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="9.8" r="2.2" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </Link>

        {showOrderButton && lineCount > 0 ? (
          <button
            type="button"
            className="menu-editorial__control menu-editorial__control--cart"
            onClick={() => dispatchCartOpen()}
            aria-label="Открыть ваш стол"
          >
            <span>Ваш стол</span>
            <strong>{lineCount}</strong>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CheckoutStateScreen({
  contextHref,
  lineCount,
  heroImage,
  eyebrow,
  title,
  body,
  actions,
  sideEyebrow,
  sideTitle,
  sideBody,
  children,
}: {
  contextHref: string;
  lineCount: number;
  heroImage: string;
  eyebrow: string;
  title: string;
  body: string;
  actions: ReactNode;
  sideEyebrow: string;
  sideTitle: string;
  sideBody?: string;
  children: ReactNode;
}) {
  return (
    <main className="checkout-editorial checkout-editorial--state">
      <CheckoutControls contextHref={contextHref} lineCount={lineCount} />

      <section className="checkout-editorial__state-hero">
        <div
          className="checkout-editorial__hero-media"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(5, 10, 13, 0.16) 0%, rgba(5, 10, 13, 0.5) 42%, rgba(5, 10, 13, 0.94) 100%), url("${heroImage}")`,
          }}
        />
        <div className="checkout-editorial__hero-overlay" />
        <div className="checkout-editorial__hero-grain" />

        <div className="checkout-editorial__state-inner">
          <ScrollReveal>
            <div className="checkout-editorial__state-grid">
              <div className="checkout-editorial__state-copy">
                <span className="checkout-editorial__brand">The Raki</span>
                <span className="checkout-editorial__eyebrow">{eyebrow}</span>
                <h1 className="checkout-editorial__title">{title}</h1>
                <p className="checkout-editorial__description">{body}</p>
                <div className="checkout-editorial__state-actions">{actions}</div>
              </div>

              <aside className="checkout-editorial__state-card">
                <div className="checkout-editorial__section-head checkout-editorial__section-head--tight">
                  <div>
                    <span className="checkout-editorial__panel-eyebrow">{sideEyebrow}</span>
                    <h2>{sideTitle}</h2>
                  </div>
                </div>
                {sideBody ? <p className="checkout-editorial__panel-copy">{sideBody}</p> : null}
                <div className="checkout-editorial__state-list">{children}</div>
              </aside>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}

export function CheckoutPage() {
  const { draft, patchDraft } = useDraft();
  const cart = getDraftCartView(draft);
  const serviceResolved = hasResolvedServiceContext(draft);
  const contextHref = getContextHref(draft.fulfillmentMode);
  const menuHref = "/menu-editorial";

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

  // Run the full `getCheckoutIssues` gate against a forward-looking draft:
  // local form state (name, phone) plus everything already persisted in the
  // saved draft (fulfillmentMode, coords, address). This catches the delivery
  // case where the user arrived at /checkout without a confirmed geo point —
  // e.g. they cleared localStorage, went back and skipped /delivery/address,
  // or the quote failed silently. Without this the operator gets "Точка на
  // карте" with null coords and has to call the guest back.
  const checkoutIssues = useMemo(
    () =>
      getCheckoutIssues({
        ...draft,
        customerName: name,
        customerPhone: phoneValid ? normalizeRuPhone(phone) : phone,
      }),
    [draft, name, phone, phoneValid],
  );
  const deliveryAddressIssue = checkoutIssues.find(
    (issue) =>
      issue.field === "delivery_coordinates" ||
      issue.field === "delivery_address",
  );
  const canSubmit = checkoutIssues.length === 0 && !submitting;
  const normalizedPhone = phoneValid ? normalizeRuPhone(phone) : null;
  const knownAuth = authHydrated && normalizedPhone ? lookupAuth(normalizedPhone) : null;
  const phoneLookupMessage = !authHydrated || !phoneValid
    ? null
    : knownAuth
      ? `С возвращением${knownAuth.name ? `, ${knownAuth.name}` : ""}. На счёте ${knownAuth.bonusBalance.toLocaleString("ru-RU")} ₽ бонусов.`
      : "Это ваш первый заказ — зарегистрируем вас при подтверждении.";

  const serviceLabel =
    cart.serviceLabel ||
    (draft.fulfillmentMode === "pickup"
      ? "Самовывоз"
      : "Адрес не выбран");
  const timingLabel =
    cart.serviceTimingLabel ||
    cart.etaLabel ||
    (draft.fulfillmentMode === "pickup"
      ? "Выберите окно"
      : "Выберите адрес");
  const serviceModeLabel = getServiceModeLabel(draft.fulfillmentMode);
  const issueLabel = getIssueLabel(cart.revalidationIssues.length);
  const selectedPayment =
    PAYMENT_OPTIONS.find((option) => option.id === paymentMethod) ?? PAYMENT_OPTIONS[0];

  const snapshot = useMemo(
    () =>
      getMenuSnapshotForContext({
        fulfillmentMode: draft.fulfillmentMode ?? "delivery",
        locationId: draft.locationId,
        servicePointId: draft.servicePointId,
      }),
    [draft.fulfillmentMode, draft.locationId, draft.servicePointId],
  );

  const heroImage = useMemo(() => {
    if (cart.lineItems.length === 0) {
      return getProductFamilyImage("boiled");
    }

    return getLineProductImage(cart.lineItems[0], snapshot.visibleItems);
  }, [cart.lineItems, snapshot.visibleItems]);

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

  const previewLines = useMemo(
    () =>
      cart.lineItems.map((item, index) => ({
        item,
        imageSrc: getLineProductImage(item, snapshot.visibleItems),
        modifierRows: item.summaryLines
          .map((line) => parseSummaryLine(line))
          .filter((row): row is ModifierRow => Boolean(row)),
        bundledSubItems: cart.bundledSubItems[index] ?? [],
      })),
    [cart.bundledSubItems, cart.lineItems, snapshot.visibleItems],
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

    // Last-chance re-validation right before the network call, against the
    // exact payload we're about to send. Defends against state drift between
    // canSubmit's memo and the click handler firing (e.g. draft patched by
    // another tab between render and click). If anything is wrong, surface
    // the first issue inline and bail.
    const finalIssues = getCheckoutIssues(nextDraft);
    if (finalIssues.length > 0) {
      setSubmitError(finalIssues[0].message);
      return;
    }

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
      loginAuth(nextDraft.customerPhone);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось передать заказ команде.");
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, comment, draft, loginAuth, name, patchDraft, paymentMethod, phone]);

  if (cart.lineItems.length === 0) {
    return (
      <CheckoutStateScreen
        contextHref={contextHref}
        lineCount={0}
        heroImage={heroImage}
        eyebrow="Оформление"
        title="Сначала соберите стол."
        body="После этого здесь останутся только контакт, оплата и подтверждение подачи."
        actions={
          <>
            <Link href={menuHref} className="checkout-editorial__submit">
              Открыть меню
            </Link>
            <Link href={contextHref} className="checkout-editorial__secondary-action">
              Уточнить сервис
            </Link>
          </>
        }
        sideEyebrow="Перед этим шагом"
        sideTitle="Проверяем три вещи"
        sideBody="Нужны адрес, контакт и оплата."
      >
        {READY_ITEMS.map((item, index) => (
          <div key={item} className="checkout-editorial__state-row">
            <span className="checkout-editorial__state-index">0{index + 1}</span>
            <span>{item}</span>
          </div>
        ))}
      </CheckoutStateScreen>
    );
  }

  if (!serviceResolved) {
    return (
      <CheckoutStateScreen
        contextHref={contextHref}
        lineCount={cart.lineCount}
        heroImage={heroImage}
        eyebrow="Оформление"
        title="Сначала закрепим адрес или точку выдачи."
        body="Сначала подтвердим место и время, затем завершим заказ."
        actions={
          <>
            <Link href={contextHref} className="checkout-editorial__submit">
              Уточнить сервис
            </Link>
            <Link href={menuHref} className="checkout-editorial__secondary-action">
              Вернуться в меню
            </Link>
          </>
        }
        sideEyebrow="По вашему столу"
        sideTitle="Место и время"
        sideBody="После подтверждения покажем точные условия."
      >
        <div className="checkout-editorial__state-row checkout-editorial__state-row--stack">
          <strong>{serviceModeLabel}</strong>
          <span>{serviceLabel}</span>
        </div>
        <div className="checkout-editorial__state-row checkout-editorial__state-row--stack">
          <strong>Окно</strong>
          <span>{timingLabel}</span>
        </div>
        <div className="checkout-editorial__state-row checkout-editorial__state-row--stack">
          <strong>Сумма</strong>
          <span>{cart.totalLabel}</span>
        </div>
      </CheckoutStateScreen>
    );
  }

  if (submittedOrder) {
    return (
      <main className="checkout-editorial checkout-editorial--complete">
        <CheckoutControls contextHref={contextHref} lineCount={0} showOrderButton={false} />

        <section className="checkout-editorial__hero checkout-editorial__hero--complete">
          <div
            className="checkout-editorial__hero-media"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(5, 10, 13, 0.18) 0%, rgba(5, 10, 13, 0.54) 42%, rgba(5, 10, 13, 0.94) 100%), url("${heroImage}")`,
            }}
          />
          <div className="checkout-editorial__hero-overlay" />
          <div className="checkout-editorial__hero-grain" />

          <div className="checkout-editorial__hero-inner">
            <ScrollReveal>
              <div className="checkout-editorial__complete-card">
                <motion.div
                  className="checkout-editorial__complete-badge"
                  initial={{ scale: 0.88, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                >
                  ✓
                </motion.div>

                <span className="checkout-editorial__eyebrow">Заказ принят</span>
                <h1 className="checkout-editorial__title">Заказ {submittedOrder.reference} принят.</h1>
                <p className="checkout-editorial__description">
                  Заказ уже в работе. Если нужно, свяжемся по указанному номеру.
                </p>

                <div className="checkout-editorial__complete-grid">
                  <div className="checkout-editorial__complete-metric">
                    <span className="checkout-editorial__panel-eyebrow">Сервис</span>
                    <strong>{submittedOrder.fulfillmentLabel}</strong>
                    <span>{submittedOrder.serviceLabel}</span>
                    <span>{timingLabel}</span>
                  </div>

                  <div className="checkout-editorial__complete-metric">
                    <span className="checkout-editorial__panel-eyebrow">Передача</span>
                    <strong>{submittedOrder.handoffLabel}</strong>
                    <span>{getHandoffStatusLabel(submittedOrder)}</span>
                    <span>
                      {submittedOrder.externalReference
                        ? `Номер заказа: ${submittedOrder.externalReference}`
                        : `К оплате: ${submittedOrder.totalLabel}`}
                    </span>
                  </div>

                  <div className="checkout-editorial__complete-metric">
                    <span className="checkout-editorial__panel-eyebrow">Гость</span>
                    <strong>{submittedOrder.guestLabel}</strong>
                    <span>{phone}</span>
                    <span>{submittedOrder.lineCount} поз. в заказе</span>
                  </div>
                </div>

                <div className="checkout-editorial__complete-actions">
                  {submittedOrder.trackingHref ? (
                    <Link href={submittedOrder.trackingHref} className="checkout-editorial__submit">
                      Отслеживать доставку
                    </Link>
                  ) : null}
                  <Link href={menuHref} className="checkout-editorial__secondary-action">
                    Вернуться в меню
                  </Link>
                  <Link href="/" className="checkout-editorial__secondary-action">
                    На главную
                  </Link>
                </div>

                <div className="checkout-editorial__complete-secondary">
                  <a href="tel:+79808880588" className="checkout-editorial__inline-link">
                    Позвонить команде
                  </a>
                  <a href="https://t.me/The_raki" className="checkout-editorial__inline-link" rel="noreferrer" target="_blank">
                    Telegram
                  </a>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-editorial">
      <CheckoutControls contextHref={contextHref} lineCount={cart.lineCount} />

      <section className="checkout-editorial__hero">
        <motion.div
          className="checkout-editorial__hero-media"
          animate={{ scale: [1.02, 1.05, 1.02] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(5, 10, 13, 0.12) 0%, rgba(5, 10, 13, 0.46) 42%, rgba(5, 10, 13, 0.92) 100%), url("${heroImage}")`,
          }}
        />
        <div className="checkout-editorial__hero-overlay" />
        <div className="checkout-editorial__hero-grain" />

        <div className="checkout-editorial__hero-inner">
          <ScrollReveal>
            <div className="checkout-editorial__hero-grid">
              <div className="checkout-editorial__hero-copy">
                <span className="checkout-editorial__brand">The Raki</span>
                <span className="checkout-editorial__eyebrow">Оформление</span>
                <h1 className="checkout-editorial__title">Проверьте заказ и оформите его.</h1>
                <p className="checkout-editorial__description">
                  Контакт, способ оплаты и окно подачи. Всё остальное уже собрано.
                </p>

                <div className="checkout-editorial__hero-stats">
                  <div className="checkout-editorial__hero-stat">
                    <span className="checkout-editorial__panel-eyebrow">Сервис</span>
                    <strong>{serviceModeLabel}</strong>
                    <span>{serviceLabel}</span>
                  </div>

                  <div className="checkout-editorial__hero-stat">
                    <span className="checkout-editorial__panel-eyebrow">Окно</span>
                    <strong>{timingLabel}</strong>
                    <span>{issueLabel ?? "Без лишних уточнений"}</span>
                  </div>

                  <div className="checkout-editorial__hero-stat">
                    <span className="checkout-editorial__panel-eyebrow">К оплате</span>
                    <strong>{cart.totalLabel}</strong>
                    <span>{cart.lineCount} поз. в заказе</span>
                  </div>
                </div>
              </div>

              <aside className="checkout-editorial__service-card">
                <div className="checkout-editorial__service-head">
                  <span className="checkout-editorial__panel-eyebrow">В этом заказе</span>
                  <strong>{cart.totalLabel}</strong>
                </div>

                <div className="checkout-editorial__service-grid">
                  <div className="checkout-editorial__service-item">
                    <span className="checkout-editorial__panel-eyebrow">Стол</span>
                    <strong>{cart.lineCount} поз.</strong>
                    <span>{cart.itemLabel ?? "Состав уточняется"}</span>
                  </div>
                  <div className="checkout-editorial__service-item">
                    <span className="checkout-editorial__panel-eyebrow">Оплата</span>
                    <strong>{selectedPayment.label}</strong>
                    <span>{selectedPayment.note}</span>
                  </div>
                  <div className="checkout-editorial__service-item">
                    <span className="checkout-editorial__panel-eyebrow">Контакт</span>
                    <strong>{phoneValid ? "Готов" : "Нужен номер"}</strong>
                    <span>{name.trim() || "Добавьте имя"}</span>
                  </div>
                  <div className="checkout-editorial__service-item">
                    <span className="checkout-editorial__panel-eyebrow">Сервис</span>
                    <strong>{serviceModeLabel}</strong>
                    <span>{timingLabel}</span>
                  </div>
                </div>
              </aside>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="checkout-editorial__workbench">
        <div className="checkout-editorial__workbench-inner">
          <ScrollReveal className="checkout-editorial__summary-shell">
            <aside id="checkout-summary" className="checkout-editorial__summary">
              <div className="checkout-editorial__summary-head">
                <div>
                  <span className="checkout-editorial__panel-eyebrow">Ваш стол</span>
                  <strong className="checkout-editorial__summary-total-price">{cart.totalLabel}</strong>
                </div>
                <span className="checkout-editorial__summary-count">{cart.lineCount} поз.</span>
              </div>

              <div className="checkout-editorial__summary-service">
                <span className="checkout-editorial__panel-eyebrow">{serviceModeLabel}</span>
                <strong>{serviceLabel}</strong>
                <span>{timingLabel}</span>
              </div>

              <div className="checkout-editorial__summary-lines">
                {previewLines.map(({ item, imageSrc, modifierRows, bundledSubItems }, index) => (
                  <article key={`${item.itemId}-${index}`} className="checkout-editorial__line">
                    <div className="checkout-editorial__line-head">
                      <div className="checkout-editorial__thumb" aria-hidden="true">
                        <Image
                          src={imageSrc}
                          alt=""
                          fill
                          sizes="72px"
                          className="checkout-editorial__thumb-image"
                        />
                      </div>

                      <div className="checkout-editorial__line-copy">
                        <div className="checkout-editorial__line-top">
                          <strong className="checkout-editorial__line-name">{item.itemName}</strong>
                          <span className="checkout-editorial__line-qty">×{item.quantity}</span>
                        </div>

                        {modifierRows.length > 0 ? (
                          <div className="checkout-editorial__modifier-list">
                            {modifierRows.map((row, rowIndex) => (
                              <div
                                key={`${row.label}-${row.value}-${rowIndex}`}
                                className="checkout-editorial__modifier-row"
                              >
                                <span>{row.label}</span>
                                <strong>{row.value}</strong>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {bundledSubItems.length > 0 ? (
                          <div className="checkout-editorial__bundle-list">
                            {bundledSubItems.map((subItem) => (
                              <span
                                key={`${subItem.parentItemId}-${subItem.id}`}
                                className="checkout-editorial__bundle-tag"
                              >
                                {subItem.title} ×{subItem.quantity}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="checkout-editorial__line-price">{formatMoney(item.totalPrice)}</div>
                  </article>
                ))}
              </div>

              <div className="checkout-editorial__summary-totals">
                <div className="checkout-editorial__total-row">
                  <span>Позиции</span>
                  <strong>{cart.subtotalLabel}</strong>
                </div>

                <div className="checkout-editorial__total-row">
                  <span>{draft.fulfillmentMode === "pickup" ? "Самовывоз" : "Доставка"}</span>
                  <strong>
                    {draft.fulfillmentMode === "pickup"
                      ? "0 ₽"
                      : cart.fee > 0
                        ? formatMoney(cart.fee)
                        : "уточним"}
                  </strong>
                </div>

                <div className="checkout-editorial__total-row checkout-editorial__total-row--grand">
                  <span>Итого</span>
                  <strong>{cart.totalLabel}</strong>
                </div>
              </div>

              {issueLabel ? (
                <div className="checkout-editorial__summary-note checkout-editorial__summary-note--warning">
                  {issueLabel}
                </div>
              ) : null}

              <div className="checkout-editorial__summary-actions">
                <button
                  type="button"
                  className="checkout-editorial__secondary-action checkout-editorial__secondary-action--dark"
                  onClick={() => dispatchCartOpen()}
                >
                  Изменить состав
                </button>
                <Link href={contextHref} className="checkout-editorial__inline-link">
                  Сервис
                </Link>
              </div>
            </aside>
          </ScrollReveal>

          <div className="checkout-editorial__form">
            <ScrollReveal delay={0.05}>
              <section className="checkout-editorial__section">
                <div className="checkout-editorial__section-head">
                  <div>
                    <span className="checkout-editorial__panel-eyebrow">Контакт</span>
                    <h2>Контакт для заказа.</h2>
                  </div>
                </div>

                <div className="checkout-editorial__field-grid">
                  <label className="checkout-editorial__field">
                    <span className="checkout-editorial__field-label">Имя</span>
                    <input
                      className="checkout-editorial__input"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Как к вам обращаться"
                    />
                  </label>

                  <label className="checkout-editorial__field">
                    <span className="checkout-editorial__field-label">Телефон</span>
                    <div className="checkout-editorial__phone-wrap">
                      <input
                        className="checkout-editorial__input"
                        data-valid={phone.length > 3 ? String(phoneValid) : undefined}
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="+7 (___) ___-__-__"
                      />

                      <AnimatePresence>
                        {phoneValid ? (
                          <motion.span
                            className="checkout-editorial__phone-ok"
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.7, opacity: 0 }}
                          >
                            ✓
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    {phoneLookupMessage ? (
                      <p
                        className="checkout-editorial__field-note"
                        data-tone={knownAuth ? "accent" : "muted"}
                      >
                        {phoneLookupMessage}
                      </p>
                    ) : null}
                  </label>

                  <label className="checkout-editorial__field checkout-editorial__field--full">
                    <span className="checkout-editorial__field-label">Комментарий</span>
                    <textarea
                      className="checkout-editorial__textarea"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Подъезд, звонок, Telegram, пожелания к выдаче"
                      rows={4}
                    />
                  </label>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal delay={0.09}>
              <section className="checkout-editorial__section">
                <div className="checkout-editorial__section-head">
                  <div>
                    <span className="checkout-editorial__panel-eyebrow">Оплата</span>
                    <h2>Зафиксируйте удобный способ.</h2>
                  </div>
                </div>

                <div className="checkout-editorial__payment-grid">
                  {PAYMENT_OPTIONS.map((option) => {
                    const active = option.id === paymentMethod;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        className="checkout-editorial__payment-option"
                        data-active={String(active)}
                        onClick={() => setPaymentMethod(option.id)}
                      >
                        <span className="checkout-editorial__panel-eyebrow">Вариант</span>
                        <strong>{option.label}</strong>
                        <span>{option.note}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </ScrollReveal>

            {checkoutUpsellItems.length > 0 ? (
              <ScrollReveal delay={0.13}>
                <section className="checkout-editorial__section">
                  <div className="checkout-editorial__section-head">
                    <div>
                      <span className="checkout-editorial__panel-eyebrow">Еще к столу</span>
                      <h2>Можно добавить.</h2>
                    </div>
                  </div>

                  <div className="checkout-editorial__upsell-grid">
                    {checkoutUpsellItems.map((entry) => (
                      <article key={entry.item.id} className="checkout-editorial__upsell-card">
                        <div
                          className="checkout-editorial__upsell-media"
                          style={{
                            backgroundImage: `linear-gradient(180deg, rgba(8, 16, 20, 0.08) 0%, rgba(8, 16, 20, 0.6) 100%), url("${getProductFamilyImage(entry.item.productFamily)}")`,
                          }}
                        />

                        <div className="checkout-editorial__upsell-body">
                          <span className="checkout-editorial__panel-eyebrow">{entry.item.category}</span>
                          <strong>{entry.item.name}</strong>
                          <p>{getUpsellNote(entry)}</p>

                          <div className="checkout-editorial__upsell-footer">
                            <strong>от {formatMoney(entry.effectiveBasePrice)}</strong>
                            <button
                              type="button"
                              className="checkout-editorial__secondary-action"
                              onClick={() => handleUpsellAdd(entry)}
                            >
                              В заказ
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </ScrollReveal>
            ) : null}

            <ScrollReveal delay={0.17}>
              <section className="checkout-editorial__section checkout-editorial__section--submit">
                <div className="checkout-editorial__section-head">
                  <div>
                    <span className="checkout-editorial__panel-eyebrow">Подтверждение</span>
                    <h2>Передать заказ.</h2>
                  </div>
                </div>

                <p className="checkout-editorial__panel-copy">Проверьте контакт, оплату и адрес.</p>

                {deliveryAddressIssue ? (
                  <div
                    className="checkout-editorial__error checkout-editorial__error--address"
                    role="alert"
                  >
                    <p>{deliveryAddressIssue.message}</p>
                    <Link
                      href={contextHref}
                      className="checkout-editorial__inline-link"
                    >
                      Вернуться на шаг адреса →
                    </Link>
                  </div>
                ) : null}

                {submitError ? (
                  <div className="checkout-editorial__error">{submitError}</div>
                ) : null}

                <div className="checkout-editorial__submit-row">
                  <button
                    type="button"
                    className="checkout-editorial__submit"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                  >
                    {submitting ? "Передаём заказ..." : "Передать заказ команде"}
                  </button>

                  <button
                    type="button"
                    className="checkout-editorial__secondary-action"
                    onClick={() => dispatchCartOpen()}
                  >
                    Изменить стол
                  </button>

                  <Link href={contextHref} className="checkout-editorial__inline-link">
                    Уточнить сервис
                  </Link>
                </div>
              </section>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </main>
  );
}

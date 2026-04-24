"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BasketLineItems } from "@/components/basket-line-items";
import { DraftActionLink } from "@/components/draft-action-link";
import { useDraft } from "@/components/draft-provider";
import { getCheckoutIssues, isValidRuPhone, normalizeRuPhone } from "@/lib/checkout";
import { evaluateDeliveryPolicyDecision } from "@/lib/delivery-policy";
import {
  findDeliveryScenarioForDraftContext,
  formatMoney,
  getAddressConfidenceLabel,
  getRoutingAssignmentDisplay,
  pickupScenarios,
} from "@/lib/fixtures";
import {
  getDraftCartView,
  getDraftTtlLabel,
  getFulfillmentLabel,
  hasResolvedServiceContext,
} from "@/lib/draft-view";
import { evaluateTimingTruth } from "@/lib/timing-policy";

function getHeroTitle(input: {
  serviceResolved: boolean;
  hasItems: boolean;
  needsBasketRepair: boolean;
  timingBlocked: boolean;
  requiresManualConfirmation: boolean;
  fulfillmentMode: "delivery" | "pickup" | null;
}) {
  if (!input.serviceResolved) {
    return input.fulfillmentMode === "pickup"
      ? "Сначала подтверждаем самовывоз."
      : "Сначала подтверждаем адрес.";
  }

  if (!input.hasItems) {
    return "Сначала собираем заказ, потом подтверждаем получателя.";
  }

  if (input.needsBasketRepair) {
    return "Сначала исправляем корзину, потом передаём заказ команде.";
  }

  if (input.timingBlocked) {
    return "Сначала заново подтверждаем время, потом двигаем заказ дальше.";
  }

  if (input.requiresManualConfirmation) {
    return "Заказ уйдёт в ручное подтверждение команды.";
  }

  return "Осталось подтвердить контакт.";
}

function getHeroSummary(input: {
  serviceResolved: boolean;
  hasItems: boolean;
  needsBasketRepair: boolean;
  timingBlocked: boolean;
  requiresManualConfirmation: boolean;
  fulfillmentMode: "delivery" | "pickup" | null;
}) {
  if (!input.serviceResolved) {
    return input.fulfillmentMode === "pickup"
      ? "Состав уже собран. После подтверждения точки и времени останется только контакт."
      : "Состав уже собран. После подтверждения адреса и времени останется только контакт.";
  }

  if (!input.hasItems) {
    return "Сначала добавьте хотя бы одну позицию.";
  }

  if (input.needsBasketRepair) {
    return "Перед последним шагом сверим корзину с выбранной подачей.";
  }

  if (input.timingBlocked) {
    return "Время подачи нужно подтвердить заново.";
  }

  if (input.requiresManualConfirmation) {
    return "Этот маршрут подтвердит команда.";
  }

  return "Сайт собирает контакт и передаёт заказ команде без онлайн-предоплаты.";
}

function getBottomBandTitle(input: {
  serviceResolved: boolean;
  hasItems: boolean;
  needsBasketRepair: boolean;
  timingBlocked: boolean;
  requiresManualConfirmation: boolean;
  fulfillmentMode: "delivery" | "pickup" | null;
}) {
  if (!input.serviceResolved) {
    return input.fulfillmentMode === "pickup"
      ? "Сначала подтверждаем самовывоз."
      : "Сначала подтверждаем адрес.";
  }

  if (!input.hasItems || input.needsBasketRepair) {
    return "Сначала возвращаем корзину в правдивое состояние.";
  }

  if (input.timingBlocked) {
    return "Сначала подтверждаем новое время.";
  }

  if (input.requiresManualConfirmation) {
    return "Заказ передадим команде на ручное подтверждение.";
  }

  return "Передаём заказ команде.";
}

function getBottomBandSummary(input: {
  serviceResolved: boolean;
  hasItems: boolean;
  needsBasketRepair: boolean;
  timingBlocked: boolean;
  requiresManualConfirmation: boolean;
  fulfillmentMode: "delivery" | "pickup" | null;
}) {
  if (!input.serviceResolved) {
    return input.fulfillmentMode === "pickup"
      ? "После этого можно спокойно перейти к подтверждению заказа."
      : "После этого можно спокойно перейти к подтверждению заказа.";
  }

  if (!input.hasItems || input.needsBasketRepair) {
    return "Сначала обновите корзину, затем подтвердите заказ.";
  }

  if (input.timingBlocked) {
    return "Выберите актуальное время подачи.";
  }

  if (input.requiresManualConfirmation) {
    return "Так мы сохраняем премиальный тон и не обещаем того, что чувствительный маршрут должен подтвердить живой человек.";
  }

  return "Подтверждаем контакт и отправляем заказ.";
}

export function CheckoutPageContent() {
  const router = useRouter();
  const { draft, hydrated, patchDraft } = useDraft();
  const cartView = getDraftCartView(draft);
  const serviceResolved = hasResolvedServiceContext(draft);
  const fulfillmentLabel = getFulfillmentLabel(draft.fulfillmentMode);
  const ttlLabel = hydrated ? getDraftTtlLabel(draft.expiresAt) : "загрузка";
  const menuHref =
    draft.fulfillmentMode === "pickup" ? "/menu?fulfillment=pickup" : "/menu?fulfillment=delivery";
  const contextHref = draft.fulfillmentMode === "pickup" ? "/pickup/points" : "/delivery/address";
  const assignment = getRoutingAssignmentDisplay({
    locationId: draft.locationId,
    servicePointId: draft.servicePointId,
    legalEntityId: draft.legalEntityId,
  });

  const normalizedPhone = normalizeRuPhone(draft.customerPhone);
  const trimmedName = draft.customerName.trim();
  const trimmedComment = draft.customerComment.trim();
  const selectedPayment = draft.paymentMethod ?? "cash_on_receipt";
  const phoneLooksValid = isValidRuPhone(normalizedPhone);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const hasItems = cartView.lineCount > 0;
  const needsBasketRepair = hasItems && cartView.state !== "ready";

  const deliveryScenario =
    draft.fulfillmentMode === "delivery"
      ? findDeliveryScenarioForDraftContext({
          serviceLabel: draft.serviceLabel,
          typedAddress: draft.typedAddress,
          normalizedAddress: draft.normalizedAddress,
        })
      : null;

  const pickupScenario =
    draft.fulfillmentMode === "pickup"
      ? pickupScenarios.find((scenario) => scenario.label === draft.serviceLabel) ??
        pickupScenarios.find((scenario) => scenario.state === draft.pickupState) ??
        pickupScenarios[0]
      : null;

  const timingReturnHref =
    draft.fulfillmentMode === "delivery"
      ? deliveryScenario
        ? `/delivery/result?scenario=${deliveryScenario.id}`
        : "/delivery/address"
      : pickupScenario
        ? `/pickup/points?scenario=${pickupScenario.id}`
        : "/pickup/points";

  const serviceContextReturnHref =
    draft.fulfillmentMode === "delivery"
      ? "/delivery/address"
      : pickupScenario
        ? `/pickup/points?scenario=${pickupScenario.id}`
        : "/pickup/points";

  const commonReturnPatch = {
    fulfillmentMode: draft.fulfillmentMode,
    deliveryState: draft.fulfillmentMode === "delivery" ? draft.deliveryState : null,
    pickupState: draft.fulfillmentMode === "pickup" ? draft.pickupState : null,
    zoneId: draft.zoneId,
    locationId: draft.locationId,
    servicePointId: draft.servicePointId,
    legalEntityId: draft.legalEntityId,
    resolverNote: draft.resolverNote,
    serviceLabel: draft.serviceLabel,
    serviceTimingLabel: draft.serviceTimingLabel,
    typedAddress: draft.typedAddress,
    normalizedAddress: draft.normalizedAddress,
    confirmedDropoffLabel: draft.confirmedDropoffLabel,
    confirmedDropoffSource: draft.confirmedDropoffSource,
    confirmedDropoffLat: draft.confirmedDropoffLat,
    confirmedDropoffLng: draft.confirmedDropoffLng,
    addressConfidence: draft.addressConfidence,
    courierInstructions: draft.courierInstructions,
    deliveryFulfillmentSource: draft.deliveryFulfillmentSource,
    deliveryVipOverride: draft.deliveryVipOverride,
    deliverySensitiveRoute: draft.deliverySensitiveRoute,
    deliveryDecisionState: draft.deliveryDecisionState,
    deliveryDecisionNote: draft.deliveryDecisionNote,
    liveDeliveryQuoteAmount: draft.liveDeliveryQuoteAmount,
    timingIntent: draft.timingIntent,
    requestedTimeSlotId: draft.requestedTimeSlotId,
    requestedTimeLabel: draft.requestedTimeLabel,
    orderStage: "context" as const,
  };

  const timingTruth = useMemo(
    () =>
      evaluateTimingTruth({
        fulfillmentMode: draft.fulfillmentMode,
        deliveryState: draft.deliveryState,
        pickupState: draft.pickupState,
        zoneId: draft.zoneId,
        locationId: draft.locationId,
        servicePointId: draft.servicePointId,
        timingIntent: draft.timingIntent,
        requestedTimeSlotId: draft.requestedTimeSlotId,
        requestedTimeLabel: draft.requestedTimeLabel,
        promiseLabel: cartView.serviceTimingLabel ?? cartView.etaLabel ?? null,
      }),
    [
      cartView.etaLabel,
      cartView.serviceTimingLabel,
      draft.deliveryState,
      draft.fulfillmentMode,
      draft.locationId,
      draft.pickupState,
      draft.requestedTimeLabel,
      draft.requestedTimeSlotId,
      draft.servicePointId,
      draft.timingIntent,
      draft.zoneId,
    ],
  );

  const issues = useMemo(
    () =>
      getCheckoutIssues({
        ...draft,
        customerName: trimmedName,
        customerPhone: normalizedPhone,
        paymentMethod: selectedPayment,
      }),
    [draft, normalizedPhone, selectedPayment, trimmedName],
  );

  const evaluatedDeliveryDecision = useMemo(
    () =>
      draft.fulfillmentMode === "delivery"
        ? evaluateDeliveryPolicyDecision({
            deliveryState: draft.deliveryState,
            zoneId: draft.zoneId,
            fulfillmentSource: draft.deliveryFulfillmentSource,
            liveQuoteAmount: draft.liveDeliveryQuoteAmount,
            etaLabel: cartView.serviceTimingLabel ?? cartView.etaLabel ?? null,
            vipOverride: draft.deliveryVipOverride,
            sensitiveRoute: draft.deliverySensitiveRoute,
          })
        : null,
    [
      cartView.etaLabel,
      cartView.serviceTimingLabel,
      draft.deliveryFulfillmentSource,
      draft.deliverySensitiveRoute,
      draft.deliveryState,
      draft.fulfillmentMode,
      draft.deliveryVipOverride,
      draft.liveDeliveryQuoteAmount,
      draft.zoneId,
    ],
  );

  const requiresManualConfirmation =
    serviceResolved && evaluatedDeliveryDecision?.decisionState === "manual_confirmation";

  const canSubmit = serviceResolved && hasItems && !needsBasketRepair && issues.length === 0;
  const basketRepairHref = hasItems ? "/cart?state=ready" : serviceResolved ? menuHref : contextHref;
  const basketRepairLabel = hasItems
    ? "Исправить корзину"
    : serviceResolved
      ? "Добавить первую позицию"
      : "Сначала подтвердить сервис";
  const lockedTimingLabel =
    timingTruth.requestedWindowLabel ||
    draft.requestedTimeLabel ||
    (draft.timingIntent === "asap" ? "Как можно скорее" : "Время ещё не подтверждено");
  const promiseLabel =
    timingTruth.promiseLabel ||
    cartView.serviceTimingLabel ||
    cartView.etaLabel ||
    "Обещание ещё не подтверждено";
  const contextLabel =
    cartView.serviceLabel ||
    draft.confirmedDropoffLabel ||
    (draft.fulfillmentMode === "pickup"
      ? "Самовывоз ещё не подтверждён"
      : "Адрес ещё не подтверждён");
  const headerChips = serviceResolved
    ? [fulfillmentLabel, lockedTimingLabel, "без предоплаты"]
    : [
        draft.fulfillmentMode === "pickup"
          ? "точка и время следующим шагом"
          : "адрес и время следующим шагом",
        "без предоплаты",
      ];
  const showNameWarning = !trimmedName && (nameTouched || attemptedSubmit);
  const showPhoneStatus = phoneTouched || attemptedSubmit || Boolean(draft.customerPhone);
  const showPhoneWarning = !phoneLooksValid && (phoneTouched || attemptedSubmit);

  useEffect(() => {
    if (serviceResolved && hasItems && draft.paymentMethod !== "cash_on_receipt") {
      patchDraft({
        paymentMethod: "cash_on_receipt",
        orderStage: "checkout",
      });
    }
  }, [draft.paymentMethod, hasItems, patchDraft, serviceResolved]);

  function persistCustomerFields() {
    patchDraft({
      customerName: trimmedName,
      customerPhone: normalizedPhone,
      customerComment: trimmedComment,
      paymentMethod: "cash_on_receipt",
      orderStage: "checkout",
    });
  }

  function handleSubmit() {
    setAttemptedSubmit(true);
    persistCustomerFields();

    if (!canSubmit) {
      return;
    }

    if (requiresManualConfirmation) {
      patchDraft({
        customerName: trimmedName,
        customerPhone: normalizedPhone,
        customerComment: trimmedComment,
        paymentMethod: "cash_on_receipt",
        deliveryDecisionState:
          evaluatedDeliveryDecision?.decisionState ?? draft.deliveryDecisionState,
        deliveryDecisionNote:
          evaluatedDeliveryDecision?.decisionNote ?? draft.deliveryDecisionNote,
        operatorResolution: null,
        operatorDecisionSummary: "",
        orderStage: "manual_confirmation",
      });

      startTransition(() => {
        router.push("/checkout/manual-confirmation?payment=cash_on_receipt");
      });

      return;
    }

    patchDraft({
      customerName: trimmedName,
      customerPhone: normalizedPhone,
      customerComment: trimmedComment,
      paymentMethod: "cash_on_receipt",
      operatorResolution: null,
      operatorDecisionSummary: "",
      orderStage: "accepted",
    });

    startTransition(() => {
      router.push("/order/accepted-001?payment=cash_on_receipt");
    });
  }

  const primaryAction = !serviceResolved
    ? {
        href: contextHref,
        label: draft.fulfillmentMode === "pickup" ? "Подтвердить самовывоз" : "Подтвердить адрес",
        patch: { orderStage: "context" as const },
      }
    : !hasItems || needsBasketRepair
      ? {
          href: basketRepairHref,
          label: basketRepairLabel,
          patch: {
            orderStage: (hasItems ? "cart" : draft.fulfillmentMode ? "menu" : "context") as
              | "cart"
              | "menu"
              | "context",
          },
        }
      : timingTruth.state === "blocked"
        ? {
            href: timingReturnHref,
            label: "Исправить время",
            patch: commonReturnPatch,
          }
        : null;

  return (
    <main className="landing">
      <div className="landing__frame">
        <section className="entry-hero">
          <div className="entry-hero__copy">
            <span className="eyebrow">Подтверждение заказа</span>
            <h1 className="landing-title">
              {getHeroTitle({
                serviceResolved,
                hasItems,
                needsBasketRepair,
                timingBlocked: timingTruth.state === "blocked",
                requiresManualConfirmation,
                fulfillmentMode: draft.fulfillmentMode,
              })}
            </h1>
            <p className="landing-summary">
              {getHeroSummary({
                serviceResolved,
                hasItems,
                needsBasketRepair,
                timingBlocked: timingTruth.state === "blocked",
                requiresManualConfirmation,
                fulfillmentMode: draft.fulfillmentMode,
              })}
            </p>

            <div className="landing-chips">
              {headerChips.map((chip) => (
                <span className="chip" key={chip}>
                  {chip}
                </span>
              ))}
            </div>

            <div className="landing-actions">
              {primaryAction ? (
                <DraftActionLink
                  className="cta cta--primary"
                  href={primaryAction.href}
                  label={primaryAction.label}
                  patch={primaryAction.patch}
                />
              ) : (
                <button className="cta cta--primary" onClick={handleSubmit} type="button">
                  {requiresManualConfirmation
                    ? "Передать на ручное подтверждение"
                    : "Передать заказ на подтверждение"}
                </button>
              )}

              <DraftActionLink
                className="cta cta--secondary"
                href={hasItems ? "/cart?state=ready" : serviceResolved ? menuHref : contextHref}
                label={
                  hasItems
                    ? "Вернуться в корзину"
                    : serviceResolved
                      ? "Вернуться в каталог"
                      : "Вернуться к сервису"
                }
                patch={{
                  orderStage: (hasItems ? "cart" : serviceResolved ? "menu" : "context") as
                    | "cart"
                    | "menu"
                    | "context",
                }}
              />

              {serviceResolved ? (
                <DraftActionLink
                  className="cta cta--ghost"
                  href={serviceContextReturnHref}
                  label={
                    draft.fulfillmentMode === "pickup"
                      ? "Изменить точку самовывоза"
                      : "Изменить адрес доставки"
                  }
                  patch={commonReturnPatch}
                />
              ) : null}
            </div>
          </div>

          <aside className="entry-hero__panel">
            {serviceResolved ? (
              <div className="landing-stat-card">
                <span className="section-title">Что уже подтверждено</span>
                <div className="metrics">
                  <div className="metric-row">
                    <span>Резерв заказа</span>
                    <strong>{ttlLabel}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Сервис</span>
                    <strong>{contextLabel}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Кухня сейчас</span>
                    <strong>{assignment.locationLabel}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Время</span>
                    <strong>{lockedTimingLabel}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Итого</span>
                    <strong>{formatMoney(cartView.total)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="landing-note-card">
                <span className="section-title">Заказ</span>
                <p className="kicker">
                  {draft.fulfillmentMode === "pickup"
                    ? "Состав уже собран. Точку и время подтверждаем следующим шагом."
                    : "Состав уже собран. Адрес и время подтверждаем следующим шагом."}
                </p>
                <div className="chips">
                  <span className="chip">{ttlLabel}</span>
                  <span className="chip">{formatMoney(cartView.total)}</span>
                </div>
              </div>
            )}
          </aside>
        </section>

        {requiresManualConfirmation ? (
          <section className="entry-section">
            <div className="entry-section__head">
              <span className="section-title">Ручное подтверждение</span>
              <h2>Команда отдельно подтвердит этот маршрут.</h2>
              <p className="muted">
                Мы подтвердим детали вручную перед финальным ответом.
              </p>
            </div>

            <article className="landing-card">
              <span className="section-title">Почему так</span>
              <h2>Сначала команда подтверждает сервис, потом гость получает финальный ответ.</h2>
              <p>{evaluatedDeliveryDecision?.decisionNote || draft.deliveryDecisionNote}</p>
            </article>
          </section>
        ) : null}

        {serviceResolved && hasItems ? (
          <section className="entry-section">
            <div className="entry-section__head">
              <span className="section-title">Контакт и состав</span>
              <h2>Подтверждаем получателя и состав заказа.</h2>
              <p className="muted">Последняя спокойная проверка перед передачей заказа команде.</p>
            </div>

            <div className="catalog-grid">
              <article className="landing-card">
                <span className="section-title">Контакт</span>
                <h2>Имя и телефон получателя.</h2>
                {showNameWarning ? (
                  <div className="status-item status-item--warning">
                    <strong>Нужно имя получателя</strong>
                    <span>Без имени команде сложнее подтвердить заказ спокойно и без лишних звонков.</span>
                  </div>
                ) : (
                  <p className="kicker">Контакт нужен только для спокойного подтверждения заказа и связи по сервису.</p>
                )}

                <div className="grid grid--2">
                  <label className="field">
                    <span>Имя получателя</span>
                    <input
                      className="input"
                      onBlur={() => {
                        setNameTouched(true);
                        persistCustomerFields();
                      }}
                      onChange={(event) =>
                        patchDraft({
                          customerName: event.target.value,
                          orderStage: "checkout",
                        })
                      }
                      placeholder="Имя гостя или помощника"
                      type="text"
                      value={draft.customerName}
                    />
                  </label>

                  <label className="field">
                    <span>Телефон</span>
                    <input
                      className="input"
                      onBlur={() => {
                        setPhoneTouched(true);
                        persistCustomerFields();
                      }}
                      onChange={(event) =>
                        patchDraft({
                          customerPhone: event.target.value,
                          orderStage: "checkout",
                        })
                      }
                      placeholder="+7XXXXXXXXXX"
                      type="tel"
                      value={draft.customerPhone}
                    />
                  </label>
                </div>

                {showPhoneStatus ? (
                  <div className={`status-item ${showPhoneWarning ? "status-item--warning" : "status-item--ok"}`}>
                    <strong>{showPhoneWarning ? "Телефон нужно поправить" : "Телефон выглядит корректно"}</strong>
                    <span>
                      {showPhoneWarning
                        ? "Нужен российский номер в формате +7XXXXXXXXXX, чтобы команда держала связь с гостем."
                        : normalizedPhone}
                    </span>
                  </div>
                ) : null}

                <label className="field">
                  <span>Комментарий для сервиса</span>
                  <textarea
                    className="input textarea"
                    onBlur={persistCustomerFields}
                    onChange={(event) =>
                      patchDraft({
                        customerComment: event.target.value,
                        orderStage: "checkout",
                      })
                    }
                    placeholder="Комментарий, если его действительно нужно передать команде"
                    rows={3}
                    value={draft.customerComment}
                  />
                </label>
              </article>

              <article className="landing-card">
                <span className="section-title">Сводка заказа</span>
                <h2>{formatMoney(cartView.total)}</h2>
                <div className="feature-grid">
                  <div className="feature-tile">
                    <span>Режим</span>
                    <strong>{fulfillmentLabel}</strong>
                    <small>{contextLabel}</small>
                  </div>
                  <div className="feature-tile">
                    <span>Время</span>
                    <strong>{lockedTimingLabel}</strong>
                    <small>{promiseLabel}</small>
                  </div>
                  <div className="feature-tile">
                    <span>Кухня сейчас</span>
                    <strong>{assignment.locationLabel}</strong>
                    <small>{assignment.servicePointLabel}</small>
                  </div>
                  <div className="feature-tile">
                    <span>Уверенность в адресе</span>
                    <strong>{getAddressConfidenceLabel(draft.addressConfidence)}</strong>
                    <small>{draft.confirmedDropoffLabel || "Точка вручения ещё не подтверждена"}</small>
                  </div>
                </div>

                <div className="metrics">
                  <div className="metric-row">
                    <span>Товары</span>
                    <strong>{formatMoney(cartView.subtotal)}</strong>
                  </div>
                  <div className="metric-row">
                    <span>{draft.fulfillmentMode === "pickup" ? "Самовывоз" : "Доставка"}</span>
                    <strong>{formatMoney(cartView.fee)}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Итого</span>
                    <strong>{formatMoney(cartView.total)}</strong>
                  </div>
                </div>

                {draft.courierInstructions ? (
                  <p className="kicker">Комментарий для курьера: {draft.courierInstructions}</p>
                ) : null}

                <BasketLineItems items={cartView.items} />
              </article>
            </div>
          </section>
        ) : null}

        <section className="landing-service-band">
          <div className="landing-service-band__copy">
            <span className="section-title">
              {serviceResolved ? "Последний шаг" : "Следующий шаг"}
            </span>
            <h2>
              {getBottomBandTitle({
                serviceResolved,
                hasItems,
                needsBasketRepair,
                timingBlocked: timingTruth.state === "blocked",
                requiresManualConfirmation,
                fulfillmentMode: draft.fulfillmentMode,
              })}
            </h2>
            <p>
              {getBottomBandSummary({
                serviceResolved,
                hasItems,
                needsBasketRepair,
                timingBlocked: timingTruth.state === "blocked",
                requiresManualConfirmation,
                fulfillmentMode: draft.fulfillmentMode,
              })}
            </p>
          </div>

          <div className="landing-service-band__actions">
            {primaryAction ? (
              <DraftActionLink
                className="cta cta--primary"
                href={primaryAction.href}
                label={primaryAction.label}
                patch={primaryAction.patch}
              />
            ) : (
              <button className="cta cta--primary" onClick={handleSubmit} type="button">
                {requiresManualConfirmation
                  ? "Передать на ручное подтверждение"
                  : "Передать заказ на подтверждение"}
              </button>
            )}

            {serviceResolved ? (
              <>
                <DraftActionLink
                  className="cta cta--secondary"
                  href={timingReturnHref}
                  label={draft.timingIntent ? "Изменить время" : "Подтвердить время"}
                  patch={commonReturnPatch}
                />
                <DraftActionLink
                  className="cta cta--secondary"
                  href={serviceContextReturnHref}
                  label={
                    draft.fulfillmentMode === "pickup"
                      ? "Изменить точку самовывоза"
                      : "Изменить адрес доставки"
                  }
                  patch={commonReturnPatch}
                />
              </>
            ) : null}

            <DraftActionLink
              className="cta cta--ghost"
              href={hasItems ? "/cart?state=ready" : serviceResolved ? menuHref : contextHref}
              label={
                hasItems
                  ? "Вернуться в корзину"
                  : serviceResolved
                    ? "Вернуться в каталог"
                    : "Вернуться к сервису"
              }
              patch={{
                orderStage: (hasItems ? "cart" : serviceResolved ? "menu" : "context") as
                  | "cart"
                  | "menu"
                  | "context",
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

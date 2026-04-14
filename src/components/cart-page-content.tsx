"use client";

import { CartLineItems } from "@/components/cart-line-items";
import { DraftActionLink } from "@/components/draft-action-link";
import { useDraft } from "@/components/draft-provider";
import {
  findDeliveryScenarioForDraftContext,
  formatMoney,
  getMenuItem,
  getRoutingAssignmentDisplay,
  pickupScenarios,
  type CartState,
} from "@/lib/fixtures";
import {
  getCartStateLabel,
  getDraftCartView,
  getTimingIntentLabel,
  hasResolvedServiceContext,
} from "@/lib/draft-view";
import { removeDraftLineItem, repriceDraftLineItemAt } from "@/lib/line-item";

type CartPageContentProps = {
  initialState: CartState;
};

function getLineCountLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} позиция`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} позиции`;
  }

  return `${count} позиций`;
}

function getHeroTitle(input: {
  state: CartState;
  lineCount: number;
  serviceResolved: boolean;
}) {
  if (!input.serviceResolved) {
    return "Корзина.";
  }

  if (input.lineCount === 0) {
    return "Сервис уже понятен, осталось собрать сам заказ.";
  }

  if (input.state === "invalidated") {
    return "Корзина просит спокойной перепроверки, а не резкого сброса.";
  }

  if (input.state === "below-minimum") {
    return "Корзина уже похожа на заказ, но ещё не дотягивает до сервисного порога.";
  }

  return "Корзина спокойно удерживает заказ перед подтверждением.";
}

function getHeroSummary(input: {
  state: CartState;
  lineCount: number;
  serviceResolved: boolean;
}) {
  if (!input.serviceResolved) {
    return "Состав уже собран. Адрес и время подтверждаются следующим шагом.";
  }

  if (input.lineCount === 0) {
    return "Пустая корзина здесь не ошибка. Она просто честно говорит, что сначала нужно выбрать позиции.";
  }

  if (input.state === "invalidated") {
    return "После смены точки, цены или доступности сайт должен помочь вернуть корзину в правдивое состояние.";
  }

  if (input.state === "below-minimum") {
    return "Если минимальный заказ ещё не достигнут, корзина должна объяснить это спокойно и без ощущения ошибки.";
  }

  return "Спокойно проверяем состав заказа и идём к подтверждению.";
}

function getBottomBandTitle(input: {
  state: CartState;
  lineCount: number;
  serviceResolved: boolean;
}) {
  if (!input.serviceResolved) {
    return "Сначала подтверждаем адрес.";
  }

  if (input.lineCount === 0) {
    return "Сначала собираем заказ, потом переходим к подтверждению.";
  }

  if (input.state === "invalidated") {
    return "Сначала возвращаем корзину в порядок, потом двигаем заказ дальше.";
  }

  if (input.state === "below-minimum") {
    return "Сначала добираем сервисный минимум, потом переходим к подтверждению.";
  }

  return "Если состав уже честный, следующий шаг должен ощущаться тихо и уверенно.";
}

function getBottomBandSummary(input: {
  state: CartState;
  lineCount: number;
  serviceResolved: boolean;
}) {
  if (!input.serviceResolved) {
    return "После этого можно спокойно перейти к подтверждению заказа.";
  }

  if (input.lineCount === 0) {
    return "Корзина не должна выталкивать гостя в пустое подтверждение. Сначала нужна хотя бы одна собранная позиция.";
  }

  if (input.state === "invalidated") {
    return "Ни цена, ни доступность не должны ломать заказ внезапно. Сначала перепроверяем проблемные строки.";
  }

  if (input.state === "below-minimum") {
    return "Сервис уже понятен, но порог ещё не достигнут. Сначала добираем корзину до рабочего уровня.";
  }

  return "Корзина уже соответствует текущему сервису. Значит дальше можно идти к подтверждению спокойно.";
}

export function CartPageContent({ initialState }: CartPageContentProps) {
  const { draft, hydrated, patchDraft } = useDraft();
  const state = hydrated ? draft.cartState : initialState;
  const serviceResolved = hasResolvedServiceContext(draft);
  const cartView = getDraftCartView({
    ...draft,
    cartState: state,
  });
  const assignment = getRoutingAssignmentDisplay({
    locationId: draft.locationId,
    servicePointId: draft.servicePointId,
    legalEntityId: draft.legalEntityId,
  });
  const hasWeightBasedLines = draft.lineItems.some(
    (lineItem) => getMenuItem(lineItem.itemId)?.commercialRules?.orderingModel === "weight_based",
  );

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

  const menuHref =
    draft.fulfillmentMode === "pickup" ? "/menu?fulfillment=pickup" : "/menu?fulfillment=delivery";
  const contextHref = draft.fulfillmentMode === "pickup" ? "/pickup/points" : "/delivery/address";
  const repairHref =
    draft.fulfillmentMode === "pickup" ? "/pickup/points" : "/menu?fulfillment=delivery";
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

  const contextLabel =
    cartView.serviceLabel ??
    (draft.fulfillmentMode === "pickup"
      ? "Самовывоз ещё не подтверждён"
      : "Адрес ещё не подтверждён");
  const timingLabel = serviceResolved
    ? draft.requestedTimeLabel || "Время ещё не выбрано"
    : "Подтверждается следующим шагом";
  const promiseLabel = serviceResolved
    ? cartView.serviceTimingLabel || cartView.etaLabel || "Обещание ещё не подтверждено"
    : "Появится после адреса";
  const primaryAction =
    !serviceResolved
      ? {
          href: contextHref,
          label: draft.fulfillmentMode === "pickup" ? "Подтвердить самовывоз" : "Подтвердить адрес",
          patch: { orderStage: "context" as const },
        }
      : cartView.state === "ready" && cartView.lineCount > 0
        ? {
            href: "/checkout",
            label: "Перейти к подтверждению",
            patch: { cartState: "ready" as const, orderStage: "checkout" as const },
          }
        : {
            href: cartView.lineCount === 0 ? menuHref : repairHref,
            label: cartView.lineCount === 0 ? "Собрать заказ" : "Исправить корзину",
            patch: {
              cartState: cartView.state,
              orderStage: (cartView.lineCount === 0 ? "menu" : "cart") as "menu" | "cart",
            },
          };

  return (
    <main className="landing">
      <div className="landing__frame">
        <section className="entry-hero">
          <div className="entry-hero__copy">
            <span className="eyebrow">Корзина</span>
            <h1 className="landing-title">
              {getHeroTitle({
                state: cartView.state,
                lineCount: cartView.lineCount,
                serviceResolved,
              })}
            </h1>
            <p className="landing-summary">
              {getHeroSummary({
                state: cartView.state,
                lineCount: cartView.lineCount,
                serviceResolved,
              })}
            </p>

            <div className="landing-chips">
              <span className="chip">{`корзина: ${getCartStateLabel(cartView.state, cartView.lineCount)}`}</span>
              <span className="chip">
                {draft.fulfillmentMode === "pickup"
                  ? "самовывоз"
                  : draft.fulfillmentMode === "delivery"
                    ? "доставка"
                    : "сервис ещё не выбран"}
              </span>
              <span className="chip">{getLineCountLabel(cartView.lineCount)}</span>
              <span className="chip">{timingLabel}</span>
            </div>

            <div className="landing-actions">
              <DraftActionLink
                className="cta cta--primary"
                href={primaryAction.href}
                label={primaryAction.label}
                patch={primaryAction.patch}
              />

              {serviceResolved ? (
                <>
                  <DraftActionLink
                    className="cta cta--secondary"
                    href={timingReturnHref}
                    label={draft.timingIntent ? "Изменить время" : "Подтвердить время"}
                    patch={commonReturnPatch}
                  />
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
                </>
              ) : (
                <DraftActionLink
                  className="cta cta--secondary"
                  href={menuHref}
                  label="Вернуться в каталог"
                  patch={{ orderStage: "menu" }}
                />
              )}
            </div>
          </div>

          <aside className="entry-hero__panel">
            {serviceResolved ? (
              <div className="landing-stat-card">
                <span className="section-title">Сервис</span>
                <div className="metrics">
                  <div className="metric-row">
                    <span>Контекст</span>
                    <strong>{contextLabel}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Кухня</span>
                    <strong>{assignment.locationLabel}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Время</span>
                    <strong>{timingLabel}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Товары</span>
                    <strong>{formatMoney(cartView.subtotal)}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Итого</span>
                    <strong>{formatMoney(cartView.total)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="landing-note-card">
                <span className="section-title">Корзина</span>
                <p className="kicker">
                  Состав уже собран. Адрес и время подтверждаются следующим шагом.
                </p>
                <div className="chips">
                  <span className="chip">{formatMoney(cartView.total)}</span>
                  <span className="chip">{getLineCountLabel(cartView.lineCount)}</span>
                </div>
              </div>
            )}
          </aside>
        </section>

        <section className="entry-section">
          <div className="entry-section__head">
            <span className="section-title">Сводка заказа</span>
            <h2>Состав и сервис.</h2>
            <p className="muted">Главное по заказу видно сразу.</p>
          </div>

          <div className="catalog-grid">
            <article className="landing-card">
              <span className="section-title">Сервис сейчас</span>
              <h2>{contextLabel}</h2>
              <div className="feature-grid">
                <div className="feature-tile">
                  <span>Режим</span>
                  <strong>
                    {draft.fulfillmentMode === "pickup"
                      ? "Самовывоз"
                      : draft.fulfillmentMode === "delivery"
                        ? "Доставка"
                        : "Не выбран"}
                  </strong>
                  <small>{assignment.locationLabel}</small>
                </div>
                <div className="feature-tile">
                  <span>Время</span>
                  <strong>{timingLabel}</strong>
                  <small>{getTimingIntentLabel(draft.timingIntent)}</small>
                </div>
                <div className="feature-tile">
                  <span>Обещание</span>
                  <strong>{promiseLabel}</strong>
                  <small>Подтверждено до перехода к корзине</small>
                </div>
                <div className="feature-tile">
                  <span>Точка вручения</span>
                  <strong>{draft.confirmedDropoffLabel || contextLabel}</strong>
                  <small>{draft.confirmedDropoffSource ? "Подтверждена до корзины" : "Под адрес текущего сервиса"}</small>
                </div>
              </div>
            </article>

            <article className="landing-card">
              <span className="section-title">Цена заказа</span>
              <h2>{formatMoney(cartView.total)}</h2>
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
            </article>
          </div>

          <article className="landing-card">
            <span className="section-title">Состав корзины</span>
            <h2>{cartView.itemLabel ?? "Пока без позиций"}</h2>
            {hasWeightBasedLines ? (
              <p className="muted">Для раков вес меняется в карточке товара, не в корзине.</p>
            ) : null}
            <CartLineItems items={cartView.items} />
          </article>
        </section>

        {cartView.revalidationIssues.length > 0 ? (
          <section className="entry-section">
            <div className="entry-section__head">
              <span className="section-title">Что нужно исправить</span>
              <h2>Если цена или доступность изменились, корзина должна сказать об этом прямо.</h2>
              <p className="muted">Без догадок: что именно изменилось и какой следующий шаг безопасен.</p>
            </div>

            <div className="entry-grid">
              {cartView.revalidationIssues.map((issue) => (
                <article className="landing-card" key={`${issue.itemId}-${issue.lineIndex}-${issue.type}`}>
                  <span className="section-title">
                    {issue.type === "item_unavailable" ? "Позиция недоступна" : "Цена изменилась"}
                  </span>
                  <h2>{issue.itemName}</h2>
                  <p>{issue.reason}</p>
                  <div className="metrics">
                    <div className="metric-row">
                      <span>Было</span>
                      <strong>{formatMoney(issue.previousBasePrice)}</strong>
                    </div>
                    <div className="metric-row">
                      <span>Сейчас</span>
                      <strong>{formatMoney(issue.currentBasePrice)}</strong>
                    </div>
                  </div>
                  <div className="cta-row">
                    {issue.type === "point_price_changed" ? (
                      <button
                        className="cta cta--primary"
                        onClick={() => {
                          const item = getMenuItem(issue.itemId);

                          if (!item) {
                            return;
                          }

                          patchDraft({
                            lineItems: repriceDraftLineItemAt(
                              draft.lineItems,
                              issue.lineIndex,
                              item,
                              issue.currentBasePrice,
                            ),
                            cartState: "ready",
                            orderStage: "cart",
                          });
                        }}
                        type="button"
                      >
                        Принять новую цену
                      </button>
                    ) : (
                      <button
                        className="cta cta--primary"
                        onClick={() =>
                          patchDraft({
                            lineItems: removeDraftLineItem(draft.lineItems, issue.lineIndex),
                            cartState: "ready",
                            orderStage: "cart",
                          })
                        }
                        type="button"
                      >
                        Убрать недоступную позицию
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="landing-service-band">
          <div className="landing-service-band__copy">
            <span className="section-title">Следующий шаг</span>
            <h2>
              {getBottomBandTitle({
                state: cartView.state,
                lineCount: cartView.lineCount,
                serviceResolved,
              })}
            </h2>
            <p>
              {getBottomBandSummary({
                state: cartView.state,
                lineCount: cartView.lineCount,
                serviceResolved,
              })}
            </p>
          </div>

          <div className="landing-service-band__actions">
            <DraftActionLink
              className="cta cta--primary"
              href={primaryAction.href}
              label={primaryAction.label}
              patch={primaryAction.patch}
            />

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
              href={menuHref}
              label="Вернуться в каталог"
              patch={{ orderStage: "menu" }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

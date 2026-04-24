"use client";

import Link from "next/link";
import { useDraft } from "@/components/draft-provider";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getDraftCartView, getFulfillmentLabel } from "@/lib/draft-view";
import {
  getDeliveryScenarioEtaLabel,
  getDeliveryScenario,
  getDeliveryDropoffSourceLabel,
  getLocation,
  getZone,
} from "@/lib/fixtures";
import {
  getDeliveryDecisionLabel,
  getDeliveryFulfillmentSourceLabel,
} from "@/lib/delivery-policy";
import { buildTwoGisHref, buildYandexMapsHref } from "@/lib/map-links";

export function DeliveryResultPage({ demoMode = false }: { demoMode?: boolean }) {
  const { draft } = useDraft();
  const cart = getDraftCartView(draft);
  const demoScenario = demoMode ? getDeliveryScenario("delivery_tverskaya_7") : null;
  const hasConfirmedAddress = Boolean(draft.typedAddress || draft.confirmedDropoffLabel || demoScenario);
  const demoSuffix = demoMode ? "?demo=investor" : "";
  const addressHref = `/delivery/address${demoSuffix}`;
  const pickupHref = `/pickup${demoSuffix}`;
  const menuHref = `/menu-editorial${demoSuffix}`;
  const checkoutHref = `/checkout${demoSuffix}`;

  const location = getLocation(
    draft.locationId || demoScenario?.assignment?.locationId || null,
  );
  const zone = getZone(draft.zoneId || demoScenario?.zoneId || null);

  const effectiveTypedAddress = draft.typedAddress || demoScenario?.typedAddress || "";
  const effectiveDropoffLabel =
    draft.confirmedDropoffLabel || demoScenario?.confirmedDropoffLabel || effectiveTypedAddress;
  const effectiveDropoffLat = draft.confirmedDropoffLat ?? demoScenario?.confirmedDropoffLat ?? null;
  const effectiveDropoffLng = draft.confirmedDropoffLng ?? demoScenario?.confirmedDropoffLng ?? null;
  const effectiveDeliveryState = draft.deliveryState || demoScenario?.state || null;
  const effectiveDecisionState = draft.deliveryDecisionState || null;
  const effectiveConfirmedDropoffSource =
    draft.confirmedDropoffSource || demoScenario?.confirmedDropoffSource || null;
  const effectiveFulfillmentSource =
    draft.deliveryFulfillmentSource || demoScenario?.fulfillmentSource || null;
  const effectiveTimingLabel =
    draft.serviceTimingLabel ||
    draft.requestedTimeLabel ||
    (demoScenario ? getDeliveryScenarioEtaLabel(demoScenario) : null) ||
    "Время уточняем";
  const effectiveQuoteAmount =
    draft.liveDeliveryQuoteAmount ?? zone?.feeAmount ?? null;

  const isInZone = effectiveDeliveryState === "in-zone";
  const isCutoff = effectiveDeliveryState === "cutoff";
  const isManual = effectiveDecisionState === "manual_confirmation";
  const canOpenMenu = isInZone || isCutoff;
  const heroTitle = isInZone
    ? "Доставка подтверждена."
    : isCutoff
      ? "Сегодня уже не успеем."
      : "Сюда пока не возим.";
  const heroLead = isInZone
    ? `Будем у вас ${effectiveTimingLabel}.`
    : isCutoff
      ? "Откроем следующее окно."
      : "Выберите другой адрес или самовывоз.";
  const timingCardLabel =
    draft.timingIntent === "scheduled"
      ? draft.requestedTimeLabel || effectiveTimingLabel || "Подтвердим отдельно"
      : effectiveTimingLabel || "Как можно скорее";
  const decisionLabel = getDeliveryDecisionLabel({
    deliveryState: effectiveDeliveryState,
    decisionState: effectiveDecisionState,
  });
  const dropoffSourceLabel = getDeliveryDropoffSourceLabel(effectiveConfirmedDropoffSource);
  const fulfillmentSourceLabel = getDeliveryFulfillmentSourceLabel(effectiveFulfillmentSource);
  const quoteLabel =
    typeof effectiveQuoteAmount === "number"
      ? `${effectiveQuoteAmount.toLocaleString("ru-RU")} ₽`
      : zone?.feeAmount
        ? `${zone.feeAmount.toLocaleString("ru-RU")} ₽`
        : "Уточним";
  const orderLabel =
    cart.lineCount > 0 ? `${cart.lineCount} поз. • ${cart.totalLabel}` : "корзина пуста";
  const primaryHref = canOpenMenu
    ? cart.lineCount > 0
      ? checkoutHref
      : menuHref
    : pickupHref;
  const primaryLabel = canOpenMenu
    ? cart.lineCount > 0
      ? "Оформить заказ"
      : "Открыть меню"
    : "Самовывоз";
  const nextStepTitle = canOpenMenu
    ? cart.lineCount > 0
      ? "Осталось оформить заказ."
      : "Теперь можно выбрать позиции."
    : "Выберите самовывоз или другой адрес.";
  const nextStepCopy = canOpenMenu
    ? cart.lineCount > 0
      ? "На оформлении останутся контакт, способ оплаты и финальная передача команде."
      : "Меню откроется уже с доставкой под этот адрес."
    : "По этому маршруту сейчас не обещаем доставку.";

  const yandexMapsHref = buildYandexMapsHref({
    label: effectiveDropoffLabel || effectiveTypedAddress,
    lat: effectiveDropoffLat,
    lng: effectiveDropoffLng,
  });
  const twoGisHref = buildTwoGisHref({
    label: effectiveDropoffLabel || effectiveTypedAddress,
    lat: effectiveDropoffLat,
    lng: effectiveDropoffLng,
  });

  if (!hasConfirmedAddress) {
    return (
      <main className="delivery-result-editorial delivery-result-editorial--empty">
        <div className="menu-editorial__controls delivery-result-editorial__controls">
          <Link href={addressHref} className="menu-editorial__control menu-editorial__control--menu">
            <span className="product-editorial__back-arrow" aria-hidden>
              ←
            </span>
            <span>Адрес</span>
          </Link>

          <div className="menu-editorial__control-stack">
            <Link href={pickupHref} className="menu-editorial__control">
              <span>Самовывоз</span>
            </Link>
          </div>
        </div>

        <section className="delivery-result-editorial__empty-shell">
          <span className="delivery-result-editorial__eyebrow">Доставка</span>
          <h1 className="delivery-result-editorial__empty-title">Сначала подтвердите адрес.</h1>
          <p className="delivery-result-editorial__empty-lead">Потом закрепим окно и сервис.</p>

          <div className="delivery-result-editorial__empty-actions">
            <Link href={addressHref} className="delivery-result-editorial__cta">
              Перейти к адресу
            </Link>
            <Link href={pickupHref} className="delivery-result-editorial__secondary-action">
              Самовывоз
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="delivery-result-editorial">
      <div className="menu-editorial__controls delivery-result-editorial__controls">
        <Link href={addressHref} className="menu-editorial__control menu-editorial__control--menu">
          <span className="product-editorial__back-arrow" aria-hidden>
            ←
          </span>
          <span>Адрес</span>
        </Link>

        <div className="menu-editorial__control-stack">
          <Link href={pickupHref} className="menu-editorial__control">
            <span>Самовывоз</span>
          </Link>
        </div>
      </div>

      <section className="delivery-result-editorial__hero">
        <div className="delivery-result-editorial__hero-overlay" />

        <div className="delivery-result-editorial__hero-inner">
          <div className="delivery-result-editorial__hero-grid">
            <ScrollReveal>
              <div className="delivery-result-editorial__hero-copy">
                <span className="delivery-result-editorial__brand">The Raki</span>
                <span className="delivery-result-editorial__eyebrow">Доставка</span>
                <h1 className="delivery-result-editorial__title">{heroTitle}</h1>
                <p className="delivery-result-editorial__lead">{heroLead}</p>

                <div className="delivery-result-editorial__hero-meta">
                  <div className="delivery-result-editorial__hero-stat">
                    <span className="delivery-result-editorial__label">Адрес</span>
                    <strong>{effectiveDropoffLabel || effectiveTypedAddress}</strong>
                    <span>{dropoffSourceLabel}</span>
                  </div>

                  <div className="delivery-result-editorial__hero-stat">
                    <span className="delivery-result-editorial__label">Окно</span>
                    <strong>{timingCardLabel}</strong>
                    <span>{decisionLabel}</span>
                  </div>

                  <div className="delivery-result-editorial__hero-stat">
                    <span className="delivery-result-editorial__label">Стоимость</span>
                    <strong>{quoteLabel}</strong>
                    <span>{fulfillmentSourceLabel}</span>
                  </div>
                </div>

                {isManual ? (
                  <div className="delivery-result-editorial__hero-note">
                    <span className="delivery-result-editorial__label">Команда</span>
                    <p>{draft.deliveryDecisionNote || "Уточним окно перед передачей заказа на кухню."}</p>
                  </div>
                ) : null}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.06}>
              <div className="delivery-result-editorial__route-shell">
                <div className="delivery-result-editorial__route-surface delivery-result-editorial__service-panel">
                  <div className="delivery-result-editorial__service-card">
                    <span className="delivery-result-editorial__label">Следующий шаг</span>
                    <strong>{nextStepTitle}</strong>
                    <p>{nextStepCopy}</p>

                    <div className="delivery-result-editorial__service-steps">
                      <div>
                        <span>Адрес</span>
                        <strong>{effectiveDropoffLabel || effectiveTypedAddress}</strong>
                      </div>
                      <div>
                        <span>Время</span>
                        <strong>{timingCardLabel}</strong>
                      </div>
                      <div>
                        <span>Доставка</span>
                        <strong>{quoteLabel}</strong>
                      </div>
                    </div>

                    <div className="delivery-result-editorial__route-actions">
                      <Link href={primaryHref} className="delivery-result-editorial__cta">
                        {primaryLabel}
                      </Link>
                      <a
                        href={yandexMapsHref}
                        rel="noreferrer"
                        target="_blank"
                        className="delivery-result-editorial__secondary-action"
                      >
                        Яндекс
                      </a>
                      <a
                        href={twoGisHref}
                        rel="noreferrer"
                        target="_blank"
                        className="delivery-result-editorial__secondary-action"
                      >
                        2GIS
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="delivery-result-editorial__workbench">
        <div className="delivery-result-editorial__workbench-inner">
          <ScrollReveal className="delivery-result-editorial__summary-shell">
            <aside className="delivery-result-editorial__summary">
              <span className="delivery-result-editorial__label">Подтверждено</span>
              <h2 className="delivery-result-editorial__summary-title">
                {effectiveDropoffLabel || effectiveTypedAddress}
              </h2>

              <div className="delivery-result-editorial__summary-block">
                <span className="delivery-result-editorial__label">Окно</span>
                <strong>{timingCardLabel}</strong>
                <p>{quoteLabel}</p>
              </div>

              <div className="delivery-result-editorial__summary-grid">
                <div className="delivery-result-editorial__summary-row">
                  <span>Зона</span>
                  <strong>{zone?.label ?? "Уточним"}</strong>
                </div>
                <div className="delivery-result-editorial__summary-row">
                  <span>Кухня</span>
                  <strong>{location?.name ?? "Осоргино, 202"}</strong>
                </div>
                <div className="delivery-result-editorial__summary-row">
                  <span>Способ</span>
                  <strong>{getFulfillmentLabel(draft.fulfillmentMode)}</strong>
                </div>
                <div className="delivery-result-editorial__summary-row">
                  <span>Подача</span>
                  <strong>{fulfillmentSourceLabel}</strong>
                </div>
              </div>

              <div className="delivery-result-editorial__summary-actions">
                <Link href={primaryHref} className="delivery-result-editorial__cta">
                  {primaryLabel}
                </Link>

                <Link href={addressHref} className="delivery-result-editorial__secondary-action">
                  Изменить адрес
                </Link>
              </div>
            </aside>
          </ScrollReveal>

          <div className="delivery-result-editorial__content">
            <ScrollReveal delay={0.06}>
              <section className="delivery-result-editorial__section">
                <div className="delivery-result-editorial__section-head">
                  <div>
                    <span className="delivery-result-editorial__label">Адрес</span>
                    <h2>{effectiveDropoffLabel || effectiveTypedAddress}</h2>
                  </div>
                </div>

                <div className="delivery-result-editorial__detail-grid">
                  <div className="delivery-result-editorial__detail-row">
                    <span>Маршрут</span>
                    <strong>{decisionLabel}</strong>
                  </div>
                  <div className="delivery-result-editorial__detail-row">
                    <span>Точка вручения</span>
                    <strong>{dropoffSourceLabel}</strong>
                  </div>
                  <div className="delivery-result-editorial__detail-row">
                    <span>Окно</span>
                    <strong>{timingCardLabel}</strong>
                  </div>
                  <div className="delivery-result-editorial__detail-row">
                    <span>Стоимость</span>
                    <strong>{quoteLabel}</strong>
                  </div>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <section className="delivery-result-editorial__section delivery-result-editorial__section--quiet">
                <div className="delivery-result-editorial__section-head">
                  <div>
                    <span className="delivery-result-editorial__label">Дальше</span>
                    <h2>{nextStepTitle}</h2>
                  </div>
                </div>

                <div className="delivery-result-editorial__detail-grid">
                  <div className="delivery-result-editorial__detail-row">
                    <span>Заказ</span>
                    <strong>{orderLabel}</strong>
                  </div>
                  <div className="delivery-result-editorial__detail-row">
                    <span>Команда</span>
                    <strong>{isManual ? "подтвердим вручную" : "готово к оформлению"}</strong>
                  </div>
                </div>

                <div className="delivery-result-editorial__contact-actions">
                  <a href="tel:+79808880588" className="delivery-result-editorial__secondary-action">
                    Позвонить
                  </a>
                  <a
                    href="https://t.me/The_raki"
                    target="_blank"
                    rel="noreferrer"
                    className="delivery-result-editorial__secondary-action"
                  >
                    Telegram
                  </a>
                </div>
              </section>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
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

const mapBounds = {
  minLng: 37.16,
  maxLng: 37.66,
  minLat: 55.61,
  maxLat: 55.8,
};

const serviceTruthLines = [
  "Маршрут подтверждаем заранее, чтобы каталог уже открывался под ваш адрес и ваше окно.",
  "Окно, форму оплаты и подачу команда уточняет спокойно, без лишних обещаний по пути.",
  "Если адрес или условия меняются, сервис перестраиваем заранее, а не в последний момент.",
] as const;

function projectPoint(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) return { x: 50, y: 50 };
  const xRatio = (lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng);
  const yRatio = (lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat);

  return {
    x: Math.min(Math.max(10 + xRatio * 80, 10), 90),
    y: Math.min(Math.max(86 - yRatio * 68, 16), 86),
  };
}

function buildRoutePath(start: { x: number; y: number }, end: { x: number; y: number }) {
  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - 14;
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

export function DeliveryResultPage({ demoMode = false }: { demoMode?: boolean }) {
  const router = useRouter();
  const { draft } = useDraft();
  const cart = getDraftCartView(draft);
  const demoScenario = demoMode ? getDeliveryScenario("delivery_tverskaya_7") : null;
  const hasConfirmedAddress = Boolean(draft.typedAddress || draft.confirmedDropoffLabel || demoScenario);

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
  const effectiveAddressConfidence =
    draft.addressConfidence || demoScenario?.addressConfidence || null;
  const effectiveFulfillmentSource =
    draft.deliveryFulfillmentSource || demoScenario?.fulfillmentSource || null;
  const effectiveTimingLabel =
    draft.serviceTimingLabel ||
    draft.requestedTimeLabel ||
    (demoScenario ? getDeliveryScenarioEtaLabel(demoScenario) : null) ||
    "Время уточняем";
  const effectiveQuoteAmount =
    draft.liveDeliveryQuoteAmount ?? zone?.feeAmount ?? null;

  const origin = location ? projectPoint(location.lat, location.lng) : { x: 18, y: 34 };
  const destination =
    effectiveDropoffLat !== null && effectiveDropoffLng !== null
      ? projectPoint(effectiveDropoffLat, effectiveDropoffLng)
      : null;

  const isInZone = effectiveDeliveryState === "in-zone";
  const isCutoff = effectiveDeliveryState === "cutoff";
  const isManual = effectiveDecisionState === "manual_confirmation";
  const confirmedEtaLabel = effectiveTimingLabel;
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
        : "Уточняем";
  const addressSnapshotCards = [
    { label: "Маршрут", value: decisionLabel },
    { label: "Точка вручения", value: dropoffSourceLabel },
    { label: "Окно", value: timingCardLabel },
  ];
  const serviceSnapshotCards = [
    { label: "Зона", value: zone?.label ?? "Уточняем" },
    { label: "Кухня", value: location?.name ?? "Уточняем" },
    { label: "Способ", value: getFulfillmentLabel(draft.fulfillmentMode) },
    { label: "Подача", value: fulfillmentSourceLabel },
    { label: "Стоимость", value: quoteLabel },
  ];

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
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "100vh", padding: "var(--space-lg)" }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 760,
            padding: "var(--space-2xl)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)",
            backgroundColor: "rgba(15, 26, 34, 0.82)",
            textAlign: "center",
          }}
        >
          <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
            Сервис
          </span>
          <h1 className="text-h1" style={{ marginBottom: "var(--space-sm)" }}>
            Сначала подтвердите адрес.
          </h1>
          <p className="text-muted" style={{ marginBottom: "var(--space-lg)", lineHeight: 1.8 }}>
            Этот экран появляется после проверки адреса, времени и точки вручения.
          </p>
          <div
            className="flex justify-center"
            style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}
          >
            <button
              type="button"
              className="cta cta--primary"
              onClick={() => startTransition(() => router.push("/delivery/address"))}
            >
              Перейти к адресу
            </button>
            <button
              type="button"
              className="cta cta--ghost"
              onClick={() => startTransition(() => router.push("/menu?fulfillment=delivery"))}
            >
              Вернуться к выбору
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex" style={{ minHeight: "100vh", paddingTop: 80, flexWrap: "wrap" }}>
      <div
        style={{
          flex: "1 1 760px",
          minWidth: 0,
          padding: "var(--space-xl) var(--space-xl) var(--space-xl) var(--space-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-lg)",
        }}
      >
        <ScrollReveal>
          <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
            Сервис подтвержден
          </span>

          {isInZone ? (
            <h1
              className="font-display"
              style={{
                fontSize: "clamp(40px, 5vw, 56px)",
                fontWeight: 700,
                color: "var(--accent)",
                lineHeight: 1.08,
                marginBottom: "var(--space-sm)",
              }}
            >
              {confirmedEtaLabel}
            </h1>
          ) : isCutoff ? (
            <h1 className="text-h1" style={{ color: "var(--warning)" }}>
              Сегодня окно уже закрыто.
            </h1>
          ) : (
            <h1 className="text-h1" style={{ color: "var(--warning)" }}>
              Этот адрес пока вне активного контура.
            </h1>
          )}

          <p className="text-muted" style={{ maxWidth: 760, lineHeight: 1.8 }}>
            {isInZone
              ? "Адрес, окно и точка вручения уже закреплены. Дальше каталог и заказ работают уже от этих условий."
              : isCutoff
                ? "По этому адресу сервис возможен, но сегодняшнее окно уже завершено. Можно вернуться завтра или выбрать самовывоз."
                : "По этому адресу сервис пока не подтверждаем. Можно сменить адрес или перейти в самовывоз."}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <div
            style={{
              padding: "calc(var(--space-lg) + 4px) 0 0",
              borderRadius: "var(--radius-xl)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "grid",
              gap: "var(--space-md)",
            }}
          >
            <div
              className="flex items-start justify-between"
              style={{ gap: "var(--space-md)", flexWrap: "wrap" }}
            >
              <div style={{ maxWidth: 560 }}>
                <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                  Адрес вручения
                </span>
                <strong style={{ display: "block", fontSize: 24, lineHeight: 1.2 }}>
                  {effectiveDropoffLabel || effectiveTypedAddress}
                </strong>
                {effectiveTypedAddress && effectiveDropoffLabel && effectiveTypedAddress !== effectiveDropoffLabel ? (
                  <div className="text-muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
                    {effectiveTypedAddress}
                  </div>
                ) : null}
              </div>

              <div className="flex" style={{ gap: "var(--space-xs)", flexWrap: "wrap" }}>
                <a
                  className="cta cta--secondary"
                  href={yandexMapsHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  Яндекс Карты
                </a>
                <a
                  className="cta cta--ghost"
                  href={twoGisHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  2GIS
                </a>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "var(--space-md)",
              }}
            >
              {addressSnapshotCards.map((card) => (
                <div
                  key={card.label}
                  style={{
                    padding: "14px 0 0",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                    {card.label}
                  </span>
                  <span>{card.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {!isInZone ? (
          <ScrollReveal delay={0.08}>
            <div
              style={{
                padding: "var(--space-md)",
                backgroundColor: "rgba(199, 105, 74, 0.1)",
                border: "1px solid var(--warning)",
                borderRadius: "var(--radius-md)",
                color: "var(--warning)",
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              {isCutoff
                ? "Прием заказов на сегодня завершен. Вернитесь к сервису завтра после 10:00."
                : "По этому адресу сервис пока не подтверждаем. Попробуйте другой адрес или перейдите в самовывоз."}
            </div>
          </ScrollReveal>
        ) : null}

        {isManual ? (
          <ScrollReveal delay={0.1}>
            <div
              style={{
                padding: "var(--space-md)",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent)",
                  flexShrink: 0,
                }}
              />
              <div>
                <p style={{ fontSize: 15, marginBottom: 4 }}>Ждём подтверждение команды</p>
                <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
                  {draft.deliveryDecisionNote ||
                    "Команда свяжется с вами и спокойно подтвердит финальное окно и подачу."}
                </p>
              </div>
            </div>
          </ScrollReveal>
        ) : null}

        <ScrollReveal delay={0.12}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "var(--space-md)",
            }}
          >
            {serviceSnapshotCards.map((card) => (
              <div
                key={card.label}
                style={{
                  padding: "14px 0 0",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: "var(--space-2xs)" }}>
                  {card.label}
                </span>
                <span style={{ fontSize: 16 }}>{card.value}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.16}>
          <div
            style={{
              padding: "calc(var(--space-lg) + 4px) 0 0",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "grid",
              gap: "var(--space-md)",
            }}
          >
            <div
              className="flex items-start justify-between"
              style={{ gap: "var(--space-md)", flexWrap: "wrap" }}
            >
              <div>
                <span className="text-eyebrow block" style={{ marginBottom: "var(--space-2xs)" }}>
                  Следующий шаг
                </span>
                <strong style={{ fontSize: 22 }}>
                  {isInZone
                    ? "Каталог уже работает от этого адреса и этого окна."
                    : "Сначала нужно выбрать другой адрес или самовывоз, потом возвращаться к заказу."}
                </strong>
              </div>
              <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.7 }}>
                  {cart.lineCount > 0
                    ? `${cart.lineCount} поз. в заказе • ${cart.totalLabel}`
                    : demoMode
                      ? "Сервис подтверждён"
                      : "Корзина пока пустая"}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "var(--space-md)",
              }}
            >
              {serviceTruthLines.map((line) => (
                <div
                  key={line}
                  style={{
                    padding: "14px 0 0",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-muted)",
                    lineHeight: 1.7,
                    fontSize: 14,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>

            <div className="flex" style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}>
              <a href="tel:+79808880588" className="cta cta--secondary">
                Позвонить команде
              </a>
              <a
                href="https://t.me/The_raki"
                target="_blank"
                rel="noreferrer"
                className="cta cta--ghost"
              >
                Telegram
              </a>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.18}>
          <div className="flex" style={{ gap: "var(--space-sm)", marginTop: "var(--space-sm)", flexWrap: "wrap" }}>
            {isInZone ? (
              <button
                type="button"
                className="cta cta--primary"
                onClick={() => startTransition(() => router.push("/menu?fulfillment=delivery"))}
              >
                Перейти к выбору
              </button>
            ) : (
              <button
                type="button"
                className="cta cta--primary"
                onClick={() => startTransition(() => router.push("/pickup/points"))}
              >
                Переключиться на самовывоз
              </button>
            )}
            <button
              type="button"
              className="cta cta--ghost"
              onClick={() => startTransition(() => router.push("/delivery/address"))}
            >
              Изменить адрес
            </button>
            {cart.lineCount > 0 ? (
              <button
                type="button"
                className="cta cta--ghost"
                onClick={() => startTransition(() => router.push("/cart"))}
              >
                Вернуться к заказу
              </button>
            ) : null}
          </div>
        </ScrollReveal>
      </div>

      <div
        style={{
          flex: "0 1 520px",
          minWidth: 320,
          backgroundColor: "var(--bg)",
          borderLeft: "1px solid var(--border)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            inset: 0,
          }}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={i * 10}
              x2={100}
              y2={i * 10}
              stroke="var(--border)"
              strokeWidth={0.2}
            />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={i * 10}
              y1={0}
              x2={i * 10}
              y2={100}
              stroke="var(--border)"
              strokeWidth={0.2}
            />
          ))}

          <polygon
            points="15,25 85,20 90,75 20,80"
            fill="rgba(99, 188, 197, 0.05)"
            stroke="rgba(99, 188, 197, 0.15)"
            strokeWidth={0.3}
          />

          {destination ? (
            <motion.path
              d={buildRoutePath(origin, destination)}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={0.5}
              strokeDasharray="2 1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.3 }}
            />
          ) : null}

          <circle cx={origin.x} cy={origin.y} r={1.5} fill="var(--accent)" />
          <text
            x={origin.x}
            y={origin.y - 3}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize={2.2}
            fontFamily="var(--font-sans), sans-serif"
          >
            Кухня
          </text>

          {destination ? (
            <motion.g
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 180, delay: 0.2 }}
            >
              <circle
                cx={destination.x}
                cy={destination.y}
                r={2}
                fill="var(--text-primary)"
                stroke="var(--accent)"
                strokeWidth={0.5}
              />
              <circle
                cx={destination.x}
                cy={destination.y}
                r={4}
                fill="none"
                stroke="rgba(99, 188, 197, 0.3)"
                strokeWidth={0.3}
              />
            </motion.g>
          ) : null}
        </svg>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            padding: "var(--space-xl)",
            display: "grid",
            alignContent: "start",
            gap: "var(--space-lg)",
          }}
        >
          <div
            style={{
              marginLeft: "auto",
              width: 380,
              maxWidth: "100%",
              padding: "var(--space-lg)",
              backgroundColor: "rgba(15, 26, 34, 0.72)",
              backdropFilter: "blur(14px)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
              Под ваш адрес
            </span>
            <h2 style={{ fontSize: 26, fontWeight: 600, marginBottom: "var(--space-sm)" }}>
              {zone?.label ?? "Маршрут уточняется"}
            </h2>
            <div className="text-muted" style={{ display: "grid", gap: 8, lineHeight: 1.7 }}>
              <span>Кухня: {location?.name ?? "Уточняем"}</span>
              <span>Подача: {fulfillmentSourceLabel}</span>
              <span>Точка вручения: {effectiveDropoffLabel || effectiveTypedAddress || "Уточняем"}</span>
              <span>Окно: {timingCardLabel}</span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--space-sm)",
            }}
          >
            <div
              style={{
                padding: "var(--space-lg)",
                backgroundColor: "rgba(15, 26, 34, 0.56)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
                Дальше по заказу
              </span>
              <div className="text-muted" style={{ lineHeight: 1.7 }}>
                {isInZone
                  ? "Маршрут уже закреплён. Дальше можно спокойно переходить к каталогу и оформлению без повторной проверки."
                  : "Если адрес не проходит, сразу предложим другой адрес или самовывоз без лишних обещаний."}
              </div>
            </div>

            <div
              style={{
                padding: "var(--space-lg)",
                backgroundColor: "rgba(15, 26, 34, 0.56)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
                Связь с командой
              </span>
              <div className="text-muted" style={{ lineHeight: 1.7 }}>
                {draft.deliveryDecisionNote ||
                  "Если нужно уточнить подъезд, окно или подачу, команда свяжется до передачи заказа на кухню."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

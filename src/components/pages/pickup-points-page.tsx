"use client";

import { motion } from "framer-motion";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDraft } from "@/components/draft-provider";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getLocation, pickupScenarios, timingSlots, type PickupState } from "@/lib/fixtures";
import { buildTwoGisHref, buildYandexMapsHref } from "@/lib/map-links";

const PICKUP_LOCATION_ID = "loc_lesnoy_01";
const PICKUP_SERVICE_POINT_ID = "sp_lesnoy_pickup_01";

const mapBounds = {
  minLng: 37.16,
  maxLng: 37.66,
  minLat: 55.61,
  maxLat: 55.8,
};

function projectPoint(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) return { x: 50, y: 50 };
  const xRatio = (lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng);
  const yRatio = (lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat);
  return {
    x: Math.min(Math.max(10 + xRatio * 80, 10), 90),
    y: Math.min(Math.max(86 - yRatio * 68, 16), 86),
  };
}

function getPickupStateLabel(state: PickupState) {
  if (state === "ready") return "Готовим без задержки";
  if (state === "delay") return "Кухня загружена";
  return "Точка закрыта";
}

function getPickupStateTone(state: PickupState) {
  if (state === "ready") return "var(--accent)";
  if (state === "delay") return "var(--warning)";
  return "var(--error)";
}

function getPickupScenarioCopy(scenarioId: string) {
  if (scenarioId === "pickup_kitchen_delay") {
    return {
      title: "Самовывоз с задержкой",
      note: "Кухня перегружена, но дальше путь остаётся понятным и без лишних обещаний.",
    };
  }

  if (scenarioId === "pickup_point_closed") {
    return {
      title: "Точка сейчас закрыта",
      note: "Самовывоз блокируем честно, а не обещаем лишнее до подтверждения заказа.",
    };
  }

  return {
    title: "Самовывоз, Осоргино, 202",
    note: "Активная точка выдачи с понятным окном и маршрутом.",
  };
}

export function PickupPointsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, patchDraft } = useDraft();

  const availableSlots = useMemo(
    () =>
      timingSlots.filter(
        (slot) =>
          slot.fulfillmentMode === "pickup" &&
          slot.locationId === PICKUP_LOCATION_ID &&
          slot.servicePointId === PICKUP_SERVICE_POINT_ID,
      ),
    [],
  );

  const scenarioFromQuery = searchParams.get("scenario");
  const fallbackScenarioId =
    scenarioFromQuery && pickupScenarios.some((scenario) => scenario.id === scenarioFromQuery)
      ? scenarioFromQuery
      : draft.pickupState === "delay"
        ? "pickup_kitchen_delay"
        : draft.pickupState === "closed"
          ? "pickup_point_closed"
          : "pickup_lesnoy_ready";

  const [selectedScenarioId, setSelectedScenarioId] = useState(fallbackScenarioId);
  const [selectedSlotId, setSelectedSlotId] = useState(
    draft.requestedTimeSlotId && availableSlots.some((slot) => slot.id === draft.requestedTimeSlotId)
      ? draft.requestedTimeSlotId
      : availableSlots[1]?.id ?? availableSlots[0]?.id ?? "",
  );

  useEffect(() => {
    if (scenarioFromQuery && pickupScenarios.some((scenario) => scenario.id === scenarioFromQuery)) {
      setSelectedScenarioId(scenarioFromQuery);
    }
  }, [scenarioFromQuery]);

  const selectedScenario =
    pickupScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? pickupScenarios[0];
  const selectedSlot =
    availableSlots.find((slot) => slot.id === selectedSlotId) ?? availableSlots[0] ?? null;
  const selectedScenarioCopy = getPickupScenarioCopy(selectedScenario.id);
  const pickupLocation = getLocation(PICKUP_LOCATION_ID);
  const pickupPoint = pickupLocation
    ? projectPoint(pickupLocation.lat, pickupLocation.lng)
    : { x: 18, y: 34 };
  const canConfirm = selectedScenario.state !== "closed" && selectedSlot !== null;
  const yandexMapsHref = buildYandexMapsHref({
    label: pickupLocation?.addressLabel ?? pickupLocation?.name ?? "Осоргино, 202",
    lat: pickupLocation?.lat ?? null,
    lng: pickupLocation?.lng ?? null,
  });
  const twoGisHref = buildTwoGisHref({
    label: pickupLocation?.addressLabel ?? pickupLocation?.name ?? "Осоргино, 202",
    lat: pickupLocation?.lat ?? null,
    lng: pickupLocation?.lng ?? null,
  });

  const handleConfirm = () => {
    if (!selectedSlot) return;

    patchDraft({
      fulfillmentMode: "pickup",
      pickupState: selectedScenario.state,
      deliveryState: null,
      zoneId: null,
      locationId: PICKUP_LOCATION_ID,
      servicePointId: PICKUP_SERVICE_POINT_ID,
      serviceLabel: selectedScenarioCopy.title,
      serviceTimingLabel: selectedSlot.label,
      requestedTimeSlotId: selectedSlot.id,
      requestedTimeLabel: selectedSlot.label,
      timingIntent: "scheduled",
      orderStage: "menu",
    });

    startTransition(() => {
      router.push("/menu?fulfillment=pickup");
    });
  };

  return (
    <div className="flex" style={{ minHeight: "100vh", paddingTop: 80 }}>
      <div
        style={{
          width: "58%",
          padding: "var(--space-xl) var(--space-xl) var(--space-xl) var(--space-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-lg)",
        }}
      >
        <ScrollReveal>
          <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
            Самовывоз
          </span>
          <h1 className="text-h1" style={{ marginBottom: "var(--space-sm)" }}>
            Подтвердить точку и время.
          </h1>
          <p className="text-muted" style={{ maxWidth: 560, fontSize: 16, lineHeight: 1.7 }}>
            Сейчас самовывоз доступен через активную точку в Осоргино. Дальше можно спокойно
            расширить выдачу на несколько точек.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "var(--space-md)",
            }}
          >
            {pickupScenarios.map((scenario) => {
              const active = scenario.id === selectedScenario.id;
              const copy = getPickupScenarioCopy(scenario.id);
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  style={{
                    textAlign: "left",
                    padding: "var(--space-md)",
                    backgroundColor: active ? "rgba(99, 188, 197, 0.08)" : "rgba(15, 26, 34, 0.42)",
                    borderRadius: "var(--radius-lg)",
                    border: `1px solid ${active ? getPickupStateTone(scenario.state) : "rgba(255,255,255,0.08)"}`,
                    cursor: "pointer",
                    transition:
                      "border-color var(--duration-short) var(--ease-out), background-color var(--duration-short) var(--ease-out), transform var(--duration-short) var(--ease-out)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: getPickupStateTone(scenario.state),
                      marginBottom: "var(--space-2xs)",
                    }}
                  >
                    {getPickupStateLabel(scenario.state)}
                  </div>
                  <div style={{ marginBottom: "var(--space-2xs)", fontWeight: 600 }}>
                    {copy.title}
                  </div>
                  <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.55 }}>
                    {copy.note}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div
            style={{
              padding: "calc(var(--space-lg) + 4px) 0 0",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "var(--space-md)",
                gap: "var(--space-md)",
              }}
            >
              <div>
                <span className="text-eyebrow block" style={{ marginBottom: "var(--space-2xs)" }}>
                  Окна готовности
                </span>
                <h2 style={{ fontSize: 24, fontWeight: 600 }}>Выберите время самовывоза</h2>
              </div>
              <span style={{ color: getPickupStateTone(selectedScenario.state), fontSize: 14 }}>
                {selectedScenario.waitLabel ? `Ориентир: ${selectedScenario.waitLabel}` : "Сегодня недоступно"}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: "var(--space-xs)",
              }}
            >
              {availableSlots.map((slot) => {
                const active = slot.id === selectedSlot?.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    disabled={selectedScenario.state === "closed"}
                    style={{
                      padding: "var(--space-md)",
                      textAlign: "left",
                      backgroundColor: active ? "rgba(99, 188, 197, 0.08)" : "rgba(15, 26, 34, 0.42)",
                      borderRadius: "var(--radius-lg)",
                      border: `1px solid ${active ? "var(--accent)" : "rgba(255,255,255,0.08)"}`,
                      cursor: selectedScenario.state === "closed" ? "not-allowed" : "pointer",
                      opacity: selectedScenario.state === "closed" ? 0.45 : 1,
                      transition:
                        "border-color var(--duration-short) var(--ease-out), background-color var(--duration-short) var(--ease-out), transform var(--duration-short) var(--ease-out)",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{slot.label}</div>
                    <div className="text-muted" style={{ fontSize: 13 }}>
                      {slot.note}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="flex" style={{ gap: "var(--space-sm)", marginTop: "var(--space-xs)" }}>
            <button
              type="button"
              className="cta cta--primary"
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={!canConfirm ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
            >
              {canConfirm ? "Подтвердить самовывоз" : "Самовывоз сейчас недоступен"}
            </button>
            <button
              type="button"
              className="cta cta--ghost"
              onClick={() => router.push("/menu?fulfillment=delivery")}
            >
              Вернуться к доставке
            </button>
          </div>
        </ScrollReveal>
      </div>

      <div
        style={{
          width: "42%",
          borderLeft: "1px solid var(--border)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
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

          <circle cx={pickupPoint.x} cy={pickupPoint.y} r={2.4} fill="var(--accent)" />
          <circle
            cx={pickupPoint.x}
            cy={pickupPoint.y}
            r={5}
            fill="none"
            stroke="rgba(99, 188, 197, 0.3)"
            strokeWidth={0.3}
          />
          <text
            x={pickupPoint.x}
            y={pickupPoint.y - 5}
            textAnchor="middle"
            fill="var(--text-primary)"
            fontSize={2.2}
            fontFamily="var(--font-sans), sans-serif"
          >
            Осоргино
          </text>
        </svg>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "var(--space-xl)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-md)",
          }}
        >
          <div
            style={{
              marginTop: "var(--space-2xl)",
              padding: "calc(var(--space-lg) + 4px)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(15, 26, 34, 0.62)",
            }}
          >
            <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
              Частная выдача
            </span>
            <h2 style={{ fontSize: 26, fontWeight: 600, marginBottom: "var(--space-sm)" }}>
              {pickupLocation?.name ?? "Осоргино, 202"}
            </h2>
            <div className="text-muted" style={{ display: "grid", gap: 8, lineHeight: 1.65 }}>
              <span>{pickupLocation?.regionLabel ?? "Одинцовский кластер"}</span>
              <span>Окно работы: 12:00–23:00</span>
              <span>Выдача заказов после подтверждения времени.</span>
              <span>Оплата после получения: карта, наличные, перевод.</span>
            </div>

            <div
              className="flex"
              style={{
                gap: "var(--space-xs)",
                marginTop: "var(--space-md)",
                flexWrap: "wrap",
              }}
            >
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
              padding: "var(--space-lg)",
              backgroundColor: "rgba(15, 26, 34, 0.56)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
              Что подтвердим
            </span>
            <div className="text-muted" style={{ display: "grid", gap: 8, lineHeight: 1.65 }}>
              <span>Точка: {pickupLocation?.name ?? "Осоргино, 202"}</span>
              <span>Формат: {selectedScenarioCopy.title}</span>
              <span>Состояние: {getPickupStateLabel(selectedScenario.state)}</span>
              <span>Время: {selectedSlot?.label ?? "не выбрано"}</span>
              <span>Режим: самовывоз</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

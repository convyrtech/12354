"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PickupMaplibreCanvas } from "@/components/maps/pickup-maplibre-canvas";
import { ScrollReveal } from "@/components/scroll-reveal";
import { useDraft } from "@/components/draft-provider";
import { getLocation, pickupScenarios, timingSlots, type PickupState } from "@/lib/fixtures";
import { buildTwoGisHref, buildYandexMapsHref } from "@/lib/map-links";

const PICKUP_LOCATION_ID = "loc_lesnoy_01";
const PICKUP_SERVICE_POINT_ID = "sp_lesnoy_pickup_01";

function getPickupStateLabel(state: PickupState) {
  if (state === "ready") return "Кухня активна";
  if (state === "delay") return "Кухня загружена";
  return "Сегодня закрыто";
}

function getPickupStateTone(state: PickupState) {
  if (state === "ready") return "var(--accent)";
  if (state === "delay") return "var(--warning)";
  return "var(--error)";
}

function getPickupScenarioCopy(scenarioId: string) {
  if (scenarioId === "pickup_kitchen_delay") {
    return {
      title: "Осоргино, 202",
      lead: "Кухня загружена. Выберите более позднее окно.",
      note: "Подскажем ближайшее удобное время.",
    };
  }

  if (scenarioId === "pickup_point_closed") {
    return {
      title: "Осоргино, 202",
      lead: "Сегодня точка закрыта.",
      note: "Выберите окно на завтра.",
    };
  }

  return {
    title: "Осоргино, 202",
    lead: "Выберите удобное окно выдачи.",
    note: "12:00–23:00",
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
  const demoMode = searchParams.get("demo") === "investor";
  const demoSuffix = demoMode ? "?demo=investor" : "";
  const pickupHref = `/pickup${demoSuffix}`;
  const deliveryHref = `/delivery/address${demoSuffix}`;
  const menuHref = `/menu-editorial${demoSuffix}`;
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
  const selectedScenarioCopy = getPickupScenarioCopy(selectedScenario.id);
  const selectedSlot =
    availableSlots.find((slot) => slot.id === selectedSlotId) ?? availableSlots[0] ?? null;
  const pickupLocation = getLocation(PICKUP_LOCATION_ID);
  const pickupTitle = pickupLocation?.name ?? selectedScenarioCopy.title;
  const pickupAddress = pickupLocation?.addressLabel ?? pickupTitle;
  const pickupHours = pickupLocation?.operatingHours
    ? `${pickupLocation.operatingHours.open}–${pickupLocation.operatingHours.close}`
    : "12:00–23:00";
  const stateTone = getPickupStateTone(selectedScenario.state);
  const canConfirm = selectedScenario.state !== "closed" && selectedSlot !== null;
  const yandexMapsHref = buildYandexMapsHref({
    label: pickupAddress,
    lat: pickupLocation?.lat ?? null,
    lng: pickupLocation?.lng ?? null,
  });
  const twoGisHref = buildTwoGisHref({
    label: pickupAddress,
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
      serviceLabel: pickupTitle,
      serviceTimingLabel: selectedSlot.label,
      requestedTimeSlotId: selectedSlot.id,
      requestedTimeLabel: selectedSlot.label,
      timingIntent: "scheduled",
      orderStage: "menu",
    });

    startTransition(() => {
      router.push(menuHref);
    });
  };

  return (
    <main className="pickup-editorial">
      <div className="menu-editorial__controls pickup-editorial__controls">
        <Link href={pickupHref} className="menu-editorial__control menu-editorial__control--menu">
          <span className="product-editorial__back-arrow" aria-hidden>
            ←
          </span>
          <span>Самовывоз</span>
        </Link>

        <div className="menu-editorial__control-stack">
          <Link href={deliveryHref} className="menu-editorial__control">
            <span>Доставка</span>
          </Link>
        </div>
      </div>

      <section className="pickup-editorial__hero">
        <div className="pickup-editorial__hero-overlay" />

        <div className="pickup-editorial__hero-inner">
          <div className="pickup-editorial__hero-grid">
            <ScrollReveal>
              <div className="pickup-editorial__hero-copy">
                <span className="pickup-editorial__brand">The Raki</span>
                <span className="pickup-editorial__eyebrow">Самовывоз</span>
                <h1 className="pickup-editorial__title">{pickupTitle}</h1>
                <p className="pickup-editorial__lead">{selectedScenarioCopy.lead}</p>

                <div className="pickup-editorial__hero-meta">
                  <div className="pickup-editorial__hero-stat">
                    <span className="pickup-editorial__label">Статус</span>
                    <strong style={{ color: stateTone }}>{getPickupStateLabel(selectedScenario.state)}</strong>
                    <span>{selectedScenarioCopy.note}</span>
                  </div>

                  <div className="pickup-editorial__hero-stat">
                    <span className="pickup-editorial__label">Окно</span>
                    <strong>{selectedSlot?.label ?? "не выбрано"}</strong>
                    <span>{selectedScenario.waitLabel ? `Ориентир ${selectedScenario.waitLabel}` : "Согласуем на месте"}</span>
                  </div>

                  <div className="pickup-editorial__hero-stat">
                    <span className="pickup-editorial__label">Режим</span>
                    <strong>Самовывоз</strong>
                    <span>{pickupAddress}</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.06}>
              <div className="pickup-editorial__map-shell">
                <div className="pickup-editorial__map-surface">
                  <PickupMaplibreCanvas
                    lat={pickupLocation?.lat ?? null}
                    lng={pickupLocation?.lng ?? null}
                    label={pickupTitle}
                    address={pickupAddress}
                  />

                  <div className="pickup-editorial__map-card">
                    <span className="pickup-editorial__label">Точка</span>
                    <strong>{pickupTitle}</strong>
                    <p>{pickupAddress}</p>

                    <div className="pickup-editorial__map-links">
                      <a href={yandexMapsHref} rel="noreferrer" target="_blank" className="pickup-editorial__map-link">
                        Яндекс
                      </a>
                      <a href={twoGisHref} rel="noreferrer" target="_blank" className="pickup-editorial__map-link">
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

      <section className="pickup-editorial__workbench">
        <div className="pickup-editorial__workbench-inner">
          <ScrollReveal className="pickup-editorial__summary-shell">
            <aside className="pickup-editorial__summary">
              <span className="pickup-editorial__label">Подтверждение</span>
              <h2 className="pickup-editorial__summary-title">{pickupTitle}</h2>

              <div className="pickup-editorial__summary-block">
                <span className="pickup-editorial__label">Сейчас</span>
                <strong style={{ color: stateTone }}>{getPickupStateLabel(selectedScenario.state)}</strong>
                <p>{selectedScenarioCopy.note}</p>
              </div>

              <div className="pickup-editorial__summary-grid">
                <div className="pickup-editorial__summary-row">
                  <span>Окно</span>
                  <strong>{selectedSlot?.label ?? "не выбрано"}</strong>
                </div>
                <div className="pickup-editorial__summary-row">
                  <span>Часы</span>
                  <strong>{pickupHours}</strong>
                </div>
                <div className="pickup-editorial__summary-row">
                  <span>Оплата</span>
                  <strong>Карта, наличные, перевод</strong>
                </div>
              </div>

              <div className="pickup-editorial__summary-actions">
                <button
                  type="button"
                  className="pickup-editorial__submit"
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                >
                  {canConfirm ? "Подтвердить самовывоз" : "Сегодня недоступно"}
                </button>

                <Link href={deliveryHref} className="pickup-editorial__secondary-action">
                  Перейти к доставке
                </Link>
              </div>
            </aside>
          </ScrollReveal>

          <div className="pickup-editorial__content">
            <ScrollReveal delay={0.06}>
              <section className="pickup-editorial__section">
                <div className="pickup-editorial__section-head">
                  <div>
                    <span className="pickup-editorial__label">Окна выдачи</span>
                    <h2>Выберите время.</h2>
                  </div>
                  <span className="pickup-editorial__section-note">
                    {selectedScenario.state === "closed"
                      ? "Самовывоз откроется после следующего окна."
                      : selectedScenario.waitLabel
                        ? `Ориентир ${selectedScenario.waitLabel}`
                        : "Выберите окно"}
                  </span>
                </div>

                <div className="pickup-editorial__slots">
                  {availableSlots.map((slot) => {
                    const active = slot.id === selectedSlot?.id;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        className="pickup-editorial__slot"
                        data-active={String(active)}
                        onClick={() => setSelectedSlotId(slot.id)}
                      >
                        <strong>{slot.label}</strong>
                        <span>{slot.note}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <section className="pickup-editorial__section pickup-editorial__section--quiet">
                <div className="pickup-editorial__section-head">
                  <div>
                    <span className="pickup-editorial__label">По точке</span>
                    <h2>{pickupTitle}</h2>
                  </div>
                </div>

                <div className="pickup-editorial__detail-grid">
                  <div className="pickup-editorial__detail-row">
                    <span>Адрес</span>
                    <strong>{pickupAddress}</strong>
                  </div>
                  <div className="pickup-editorial__detail-row">
                    <span>Точка</span>
                    <strong>{pickupTitle}</strong>
                  </div>
                  <div className="pickup-editorial__detail-row">
                    <span>Режим</span>
                    <strong>Самовывоз</strong>
                  </div>
                </div>
              </section>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </main>
  );
}

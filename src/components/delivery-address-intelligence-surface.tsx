"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DeliveryMapSurface } from "@/components/delivery-map-surface";
import { useDraft } from "@/components/draft-provider";
import { YandexDeliveryLiveCanvas } from "@/components/yandex-delivery-live-canvas";
import {
  evaluateRoutingAssignment,
  findDeliveryScenarioForDraftContext,
  getAddressConfidenceLabel,
  getDefaultTimingSlotForContext,
  getDynamicDeliveryEtaLabel,
  getDeliveryAddressSuggestions,
  getDeliveryDropoffSourceLabel,
  getDeliveryScenario,
  getDeliveryScenarioEtaLabel,
  getDropoffCorrectionOptions,
  getRoutingAssignmentDisplay,
  type DeliveryScenario,
  type DropoffCorrectionOption,
} from "@/lib/fixtures";
import {
  fetchYandexAddressSuggestions,
  hasYandexMapsApiKey,
  hasYandexSuggestApiKey,
  type YandexSuggestItem,
} from "@/lib/yandex-maps";
import {
  evaluateDeliveryPolicyDecision,
  getDeliveryDecisionLabel,
} from "@/lib/delivery-policy";

type PinPreview = {
  id: string;
  label: string;
  note: string;
  normalizedAddress: string | null;
  confirmedDropoffLabel: string | null;
  confirmedDropoffSource: DeliveryScenario["confirmedDropoffSource"];
  confirmedDropoffLat: number | null;
  confirmedDropoffLng: number | null;
  addressConfidence: DeliveryScenario["addressConfidence"];
  courierInstructions: string;
  etaAdjustmentMinutes?: number;
};

type LivePinOverride = {
  lat: number;
  lng: number;
  resolvedAddress: string | null;
};

function buildScenarioPinPreviews(
  scenario: DeliveryScenario,
  correctionOptions: DropoffCorrectionOption[],
) {
  const scenarioPin: PinPreview = {
    id: `${scenario.id}_default_dropoff`,
    label: "Основная точка вручения",
    note: "Лучшее совпадение по текущему адресу.",
    normalizedAddress: scenario.normalizedAddress,
    confirmedDropoffLabel: scenario.confirmedDropoffLabel,
    confirmedDropoffSource: scenario.confirmedDropoffSource,
    confirmedDropoffLat: scenario.confirmedDropoffLat,
    confirmedDropoffLng: scenario.confirmedDropoffLng,
    addressConfidence: scenario.addressConfidence,
    courierInstructions: scenario.courierInstructions,
    etaAdjustmentMinutes: 0,
  };

  return [
    scenarioPin,
    ...correctionOptions
      .filter(
        (option) =>
          option.confirmedDropoffLabel !== scenario.confirmedDropoffLabel ||
          option.confirmedDropoffLat !== scenario.confirmedDropoffLat ||
          option.confirmedDropoffLng !== scenario.confirmedDropoffLng,
      )
      .map((option) => ({
        id: option.id,
        label: option.label,
        note: option.note,
        normalizedAddress: option.normalizedAddress,
        confirmedDropoffLabel: option.confirmedDropoffLabel,
        confirmedDropoffSource: option.confirmedDropoffSource,
        confirmedDropoffLat: option.confirmedDropoffLat,
        confirmedDropoffLng: option.confirmedDropoffLng,
        addressConfidence: option.addressConfidence,
        courierInstructions: option.courierInstructions,
        etaAdjustmentMinutes: option.etaAdjustmentMinutes,
      })),
  ];
}

function buildEffectivePin(input: {
  selectedPin: PinPreview | null;
  selectedScenario: DeliveryScenario;
  livePinOverride: LivePinOverride | null;
}) {
  if (!input.livePinOverride) {
    return input.selectedPin;
  }

  return {
    ...(input.selectedPin ?? {
      id: `${input.selectedScenario.id}_live_override`,
      label: "Точка с карты",
      note: "Точку вручения уточнили на карте.",
      normalizedAddress: input.selectedScenario.normalizedAddress,
      confirmedDropoffLabel: input.selectedScenario.confirmedDropoffLabel,
      confirmedDropoffSource: input.selectedScenario.confirmedDropoffSource,
      confirmedDropoffLat: input.selectedScenario.confirmedDropoffLat,
      confirmedDropoffLng: input.selectedScenario.confirmedDropoffLng,
      addressConfidence: input.selectedScenario.addressConfidence,
      courierInstructions: input.selectedScenario.courierInstructions,
      etaAdjustmentMinutes: 0,
    }),
    id: `${input.selectedScenario.id}_live_override`,
    label: "Точка с карты",
    note: "Точку вручения уточнили на карте.",
    normalizedAddress:
      input.livePinOverride.resolvedAddress ??
      input.selectedPin?.normalizedAddress ??
      input.selectedScenario.normalizedAddress,
    confirmedDropoffLabel:
      input.livePinOverride.resolvedAddress ??
      input.selectedPin?.confirmedDropoffLabel ??
      input.selectedScenario.confirmedDropoffLabel,
    confirmedDropoffSource: "map_pin" as DeliveryScenario["confirmedDropoffSource"],
    confirmedDropoffLat: input.livePinOverride.lat,
    confirmedDropoffLng: input.livePinOverride.lng,
    addressConfidence: "medium" as DeliveryScenario["addressConfidence"],
    courierInstructions:
      input.selectedPin?.courierInstructions ?? input.selectedScenario.courierInstructions,
    etaAdjustmentMinutes: undefined,
  };
}

export function DeliveryAddressIntelligenceSurface() {
  const router = useRouter();
  const { draft, resetDraft } = useDraft();

  const matchedScenario =
    findDeliveryScenarioForDraftContext({
      serviceLabel: draft.serviceLabel,
      typedAddress: draft.typedAddress,
      normalizedAddress: draft.normalizedAddress,
    }) ?? getDeliveryScenario("delivery_tverskaya_7");

  const [query, setQuery] = useState(matchedScenario?.typedAddress ?? "");
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    matchedScenario?.id ?? "delivery_tverskaya_7",
  );
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [livePinOverride, setLivePinOverride] = useState<LivePinOverride | null>(null);
  const [liveAddressSuggestions, setLiveAddressSuggestions] = useState<YandexSuggestItem[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const yandexSuggestSessionToken = useMemo(
    () =>
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "raki_site_session",
    [],
  );

  const fallbackSuggestions = useMemo(() => getDeliveryAddressSuggestions(""), []);
  const liveSuggestions = useMemo(() => getDeliveryAddressSuggestions(query), [query]);
  const suggestions = liveSuggestions.length > 0 ? liveSuggestions : fallbackSuggestions;
  const selectedScenario =
    getDeliveryScenario(selectedScenarioId) ?? suggestions[0] ?? matchedScenario;

  const correctionOptions = useMemo(
    () => getDropoffCorrectionOptions(selectedScenario?.id),
    [selectedScenario?.id],
  );

  const pinPreviews = useMemo(
    () => (selectedScenario ? buildScenarioPinPreviews(selectedScenario, correctionOptions) : []),
    [selectedScenario, correctionOptions],
  );

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      if (!hasYandexSuggestApiKey() || query.trim().length < 3) {
        if (active) {
          setLiveAddressSuggestions([]);
          setIsSuggestionsLoading(false);
          setSuggestionsError(null);
        }
        return;
      }

      if (active) {
        setIsSuggestionsLoading(true);
        setSuggestionsError(null);
      }

      try {
        const items = await fetchYandexAddressSuggestions({
          query,
          sessionToken: yandexSuggestSessionToken,
        });

        if (active) {
          setLiveAddressSuggestions(items);
          setIsSuggestionsLoading(false);
        }
      } catch (error) {
        if (active) {
          setLiveAddressSuggestions([]);
          setIsSuggestionsLoading(false);
          setSuggestionsError(
            error instanceof Error ? error.message : "Не удалось получить подсказки адреса.",
          );
        }
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, yandexSuggestSessionToken]);

  if (!selectedScenario) {
    return null;
  }

  const selectedPin =
    pinPreviews.find((pin) => pin.id === selectedPinId) ?? pinPreviews[0] ?? null;
  const effectivePin = buildEffectivePin({
    selectedPin,
    selectedScenario,
    livePinOverride,
  });

  const routingEvaluation = evaluateRoutingAssignment({
    fulfillmentMode: "delivery",
    deliveryState: selectedScenario.state,
    zoneId: selectedScenario.zoneId,
    typedAddress: selectedScenario.typedAddress,
    normalizedAddress: effectivePin?.normalizedAddress ?? selectedScenario.normalizedAddress,
    fulfillmentSource: selectedScenario.fulfillmentSource,
    vipOverride: selectedScenario.vipOverride,
    sensitiveRoute: selectedScenario.sensitiveRoute,
  });
  const assignment = getRoutingAssignmentDisplay(routingEvaluation);
  const dynamicEtaLabel = getDynamicDeliveryEtaLabel({
    locationId: routingEvaluation.locationId,
    zoneId: selectedScenario.zoneId,
    deliveryState: selectedScenario.state,
    destinationLat: effectivePin?.confirmedDropoffLat ?? selectedScenario.confirmedDropoffLat,
    destinationLng: effectivePin?.confirmedDropoffLng ?? selectedScenario.confirmedDropoffLng,
    fallbackEtaLabel: getDeliveryScenarioEtaLabel(selectedScenario),
    fulfillmentSource: selectedScenario.fulfillmentSource,
    addressConfidence: effectivePin?.addressConfidence ?? selectedScenario.addressConfidence,
    vipOverride: selectedScenario.vipOverride,
    sensitiveRoute: selectedScenario.sensitiveRoute,
    etaAdjustmentMinutes: effectivePin?.etaAdjustmentMinutes,
  });
  const decision = evaluateDeliveryPolicyDecision({
    deliveryState: selectedScenario.state,
    zoneId: selectedScenario.zoneId,
    fulfillmentSource: selectedScenario.fulfillmentSource,
    liveQuoteAmount: selectedScenario.liveQuoteAmount,
    etaLabel: dynamicEtaLabel,
    vipOverride: selectedScenario.vipOverride,
    sensitiveRoute: selectedScenario.sensitiveRoute,
  });
  const cutoffSlot =
    selectedScenario.state === "cutoff"
      ? getDefaultTimingSlotForContext({
          fulfillmentMode: "delivery",
          deliveryState: selectedScenario.state,
          zoneId: selectedScenario.zoneId,
        })
      : null;

  const handleConfirmAddress = () => {
    resetDraft({
      fulfillmentMode: "delivery",
      deliveryState: selectedScenario.state,
      zoneId: selectedScenario.zoneId,
      locationId: routingEvaluation.locationId,
      servicePointId: routingEvaluation.servicePointId,
      legalEntityId: routingEvaluation.legalEntityId,
      resolverNote: routingEvaluation.resolverNote,
      serviceLabel: selectedScenario.label,
      serviceTimingLabel: dynamicEtaLabel ?? "",
      typedAddress: selectedScenario.typedAddress,
      normalizedAddress: effectivePin?.normalizedAddress ?? selectedScenario.normalizedAddress ?? "",
      confirmedDropoffLabel:
        effectivePin?.confirmedDropoffLabel ?? selectedScenario.confirmedDropoffLabel ?? "",
      confirmedDropoffSource:
        effectivePin?.confirmedDropoffSource ?? selectedScenario.confirmedDropoffSource,
      confirmedDropoffLat:
        effectivePin?.confirmedDropoffLat ?? selectedScenario.confirmedDropoffLat,
      confirmedDropoffLng:
        effectivePin?.confirmedDropoffLng ?? selectedScenario.confirmedDropoffLng,
      addressConfidence: effectivePin?.addressConfidence ?? selectedScenario.addressConfidence,
      courierInstructions:
        effectivePin?.courierInstructions ?? selectedScenario.courierInstructions,
      deliveryFulfillmentSource: selectedScenario.fulfillmentSource,
      deliveryVipOverride: selectedScenario.vipOverride ?? false,
      deliverySensitiveRoute: selectedScenario.sensitiveRoute ?? false,
      deliveryDecisionState: decision.decisionState,
      deliveryDecisionNote: decision.decisionNote,
      liveDeliveryQuoteAmount: selectedScenario.liveQuoteAmount,
      timingIntent: selectedScenario.state === "cutoff" ? "scheduled" : "asap",
      requestedTimeSlotId: cutoffSlot?.id ?? null,
      requestedTimeLabel:
        selectedScenario.state === "cutoff" ? cutoffSlot?.label ?? "" : "Как можно скорее",
      orderStage: "context",
    });

    startTransition(() => {
      const params = new URLSearchParams({
        scenario: selectedScenario.id,
      });

      if (selectedPin && selectedPin.id !== `${selectedScenario.id}_default_dropoff`) {
        params.set("pin", selectedPin.id);
      }

      if (livePinOverride) {
        params.set("lat", String(livePinOverride.lat));
        params.set("lng", String(livePinOverride.lng));

        if (effectivePin?.confirmedDropoffLabel) {
          params.set("dropoff", effectivePin.confirmedDropoffLabel);
        }

        if (effectivePin?.normalizedAddress) {
          params.set("normalized", effectivePin.normalizedAddress);
        }

        if (effectivePin?.addressConfidence) {
          params.set("confidence", effectivePin.addressConfidence);
        }

        if (effectivePin?.confirmedDropoffSource) {
          params.set("source", effectivePin.confirmedDropoffSource);
        }
      }

      router.push(`/delivery/result?${params.toString()}`);
    });
  };

  const alternativePins = pinPreviews
    .filter(
      (pin) =>
        pin.id !== effectivePin?.id &&
        pin.confirmedDropoffLat !== null &&
        pin.confirmedDropoffLng !== null,
    )
    .map((pin) => ({
      id: pin.id,
      label: pin.label,
      lat: pin.confirmedDropoffLat as number,
      lng: pin.confirmedDropoffLng as number,
    }));

  const applyLiveAddressSuggestion = (suggestion: YandexSuggestItem) => {
    const nextQuery = suggestion.formattedAddress ?? suggestion.title;
    const matchedLiveScenario = getDeliveryAddressSuggestions(nextQuery)[0] ?? selectedScenario;

    setQuery(nextQuery);
    setSelectedScenarioId(matchedLiveScenario.id);
    setSelectedPinId(null);
    setLivePinOverride(null);
  };

  return (
    <section className="entry-section">
      <div className="entry-section__head">
        <span className="section-title">Адрес доставки</span>
        <h2>Введите адрес и подтвердите точку вручения.</h2>
        <p className="muted">Каталог открываем уже под подтверждённый сервис.</p>
      </div>

      <div className="address-intelligence-grid">
        <article className="landing-card address-intelligence-panel">
          <div className="field">
            <span>Адрес или ориентир</span>
            <input
              className="input"
              placeholder="Например, Тверская, 7 или Барвиха"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {hasYandexSuggestApiKey() ? (
            <div className="address-live-suggestions">
              <div className="address-live-suggestions__head">
                <strong>Подсказки адреса</strong>
                <span>Помогают быстрее найти адрес. Итоговое обещание подтверждает The Raki.</span>
              </div>

              {isSuggestionsLoading ? (
                <p className="kicker">Подтягиваем варианты адреса.</p>
              ) : null}

              {!isSuggestionsLoading && liveAddressSuggestions.length > 0 ? (
                <div className="address-live-suggestions__list">
                  {liveAddressSuggestions.map((suggestion) => (
                    <button
                      className="address-live-suggestion-card"
                      key={`${suggestion.title}_${suggestion.subtitle ?? ""}`}
                      type="button"
                      onClick={() => applyLiveAddressSuggestion(suggestion)}
                    >
                      <strong>{suggestion.title}</strong>
                      <span>
                        {suggestion.formattedAddress ??
                          suggestion.subtitle ??
                          "Адрес уточняется на карте"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {!isSuggestionsLoading && suggestionsError ? (
                <p className="kicker">{suggestionsError}</p>
              ) : null}
            </div>
          ) : null}

          <div className="address-suggestion-list">
            {suggestions.map((scenario) => {
              const active = scenario.id === selectedScenario.id;
              const eta = getDynamicDeliveryEtaLabel({
                locationId: evaluateRoutingAssignment({
                  fulfillmentMode: "delivery",
                  deliveryState: scenario.state,
                  zoneId: scenario.zoneId,
                  typedAddress: scenario.typedAddress,
                  normalizedAddress: scenario.normalizedAddress,
                  fulfillmentSource: scenario.fulfillmentSource,
                  vipOverride: scenario.vipOverride,
                  sensitiveRoute: scenario.sensitiveRoute,
                }).locationId,
                zoneId: scenario.zoneId,
                deliveryState: scenario.state,
                destinationLat: scenario.confirmedDropoffLat,
                destinationLng: scenario.confirmedDropoffLng,
                fallbackEtaLabel: getDeliveryScenarioEtaLabel(scenario),
                fulfillmentSource: scenario.fulfillmentSource,
                addressConfidence: scenario.addressConfidence,
                vipOverride: scenario.vipOverride,
                sensitiveRoute: scenario.sensitiveRoute,
                etaAdjustmentMinutes: 0,
              });

              return (
                <button
                  key={scenario.id}
                  type="button"
                  className={`address-suggestion-card${active ? " address-suggestion-card--active" : ""}`}
                  onClick={() => {
                    setSelectedScenarioId(scenario.id);
                    setSelectedPinId(null);
                    setLivePinOverride(null);
                    setQuery(scenario.typedAddress);
                  }}
                >
                  <span className="section-title">{scenario.label}</span>
                  <strong>{scenario.normalizedAddress ?? scenario.typedAddress}</strong>
                  <small>{eta ?? "Время уточним вручную"}</small>
                </button>
              );
            })}
          </div>
        </article>

        <DeliveryMapSurface
          title="По этому адресу уже подтверждаем сервис."
          summary="Сначала фиксируем адрес и время, потом открываем каталог."
          serviceLabel={selectedScenario.label}
          typedAddress={selectedScenario.typedAddress}
          normalizedAddress={effectivePin?.normalizedAddress ?? selectedScenario.normalizedAddress}
          confirmedDropoffLabel={
            effectivePin?.confirmedDropoffLabel ?? selectedScenario.confirmedDropoffLabel
          }
          confirmedDropoffSourceLabel={getDeliveryDropoffSourceLabel(
            effectivePin?.confirmedDropoffSource ?? selectedScenario.confirmedDropoffSource,
          )}
          addressConfidenceLabel={getAddressConfidenceLabel(
            effectivePin?.addressConfidence ?? selectedScenario.addressConfidence,
          )}
          etaLabel={dynamicEtaLabel}
          currentLocationId={routingEvaluation.locationId}
          currentLocationLabel={assignment.locationLabel}
          futureLocationId={null}
          futureLocationLabel={undefined}
          destinationLat={effectivePin?.confirmedDropoffLat ?? selectedScenario.confirmedDropoffLat}
          destinationLng={effectivePin?.confirmedDropoffLng ?? selectedScenario.confirmedDropoffLng}
          decisionLabel={getDeliveryDecisionLabel({
            deliveryState: selectedScenario.state,
            decisionState: decision.decisionState,
          })}
          serviceNarrative="Если точка вручения смещается даже на соседний вход, обещание по времени меняется сразу."
          footerNote={
            effectivePin && effectivePin.id !== `${selectedScenario.id}_default_dropoff`
              ? `${effectivePin.note} Время уже пересчитано по новой точке вручения.`
              : null
          }
          alternativePins={alternativePins}
          liveCanvas={
            hasYandexMapsApiKey() ? (
              <YandexDeliveryLiveCanvas
                currentLocationId={routingEvaluation.locationId}
                futureLocationId={routingEvaluation.futureLocationId}
                destinationLat={
                  effectivePin?.confirmedDropoffLat ?? selectedScenario.confirmedDropoffLat
                }
                destinationLng={
                  effectivePin?.confirmedDropoffLng ?? selectedScenario.confirmedDropoffLng
                }
                destinationLabel={
                  effectivePin?.confirmedDropoffLabel ?? selectedScenario.confirmedDropoffLabel
                }
                alternativePins={alternativePins}
                onDestinationPreview={(preview) => setLivePinOverride(preview)}
              />
            ) : null
          }
        />
      </div>

      <div className="entry-section__head">
        <span className="section-title">Точка вручения</span>
        <h2>Подтверждаем точку, по которой команда действительно сдержит обещание.</h2>
        <p className="muted">Короткая проверка перед каталогом.</p>
      </div>

      <div className="route-grid">
        {pinPreviews.map((pin) => {
          const etaLabel = getDynamicDeliveryEtaLabel({
            locationId: routingEvaluation.locationId,
            zoneId: selectedScenario.zoneId,
            deliveryState: selectedScenario.state,
            destinationLat: pin.confirmedDropoffLat,
            destinationLng: pin.confirmedDropoffLng,
            fallbackEtaLabel: getDeliveryScenarioEtaLabel(selectedScenario),
            fulfillmentSource: selectedScenario.fulfillmentSource,
            addressConfidence: pin.addressConfidence,
            vipOverride: selectedScenario.vipOverride,
            sensitiveRoute: selectedScenario.sensitiveRoute,
            etaAdjustmentMinutes: pin.etaAdjustmentMinutes,
          });
          const active = pin.id === effectivePin?.id;

          return (
            <article className={`route-card${active ? " route-card--active" : ""}`} key={pin.id}>
              <div className="route-card__head">
                <div>
                  <span className="section-title">{pin.label}</span>
                  <h3 className="route-card__title">
                    {pin.confirmedDropoffLabel ?? "Точку вручения ещё уточняем"}
                  </h3>
                </div>
                <span className={`pill${active ? " pill--accent" : ""}`}>
                  {etaLabel ?? "Время уточним вручную"}
                </span>
              </div>
              <p>{pin.note}</p>
              <div className="scenario-details">
                <div className="scenario-detail">
                  <span>Подтверждение</span>
                  <strong>{getDeliveryDropoffSourceLabel(pin.confirmedDropoffSource)}</strong>
                </div>
                <div className="scenario-detail">
                  <span>Точность</span>
                  <strong>{getAddressConfidenceLabel(pin.addressConfidence)}</strong>
                </div>
              </div>
              {pin.courierInstructions ? <p className="kicker">{pin.courierInstructions}</p> : null}
              <button
                type="button"
                className={active ? "cta cta--secondary" : "cta cta--ghost"}
                onClick={() => {
                  setSelectedPinId(pin.id);
                  setLivePinOverride(null);
                }}
              >
                {active ? "Точка уже выбрана" : "Выбрать эту точку"}
              </button>
            </article>
          );
        })}
      </div>

      <section className="landing-service-band">
        <div className="landing-service-band__copy">
          <span className="section-title">Дальше</span>
          <h2>После этого открываем каталог уже под подтверждённый сервис.</h2>
          <p>Если точка меняется, время меняется вместе с ней.</p>
        </div>

        <div className="landing-service-band__actions">
          <button className="cta cta--primary" type="button" onClick={handleConfirmAddress}>
            Подтвердить адрес и перейти в каталог
          </button>
        </div>
      </section>
    </section>
  );
}

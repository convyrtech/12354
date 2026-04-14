"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DeliveryMaplibreCanvas } from "@/components/maps/delivery-maplibre-canvas";
import { useDraft } from "@/components/draft-provider";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  evaluateRoutingAssignment,
  formatMoney,
  getAddressConfidenceLabel,
  getDefaultTimingSlotForContext,
  getDeliveryAddressSuggestions,
  getDeliveryDropoffSourceLabel,
  getDeliveryScenario,
  getDeliveryScenarioEtaLabel,
  getDropoffCorrectionOptions,
  getDynamicDeliveryEtaLabel,
  getLocation,
  getRoutingAssignmentDisplay,
  getZone,
  type DeliveryScenario,
} from "@/lib/fixtures";
import {
  evaluateDeliveryPolicyDecision,
  getDeliveryDecisionLabel,
  getDeliveryFulfillmentSourceLabel,
} from "@/lib/delivery-policy";
import {
  fetchDeliveryAddressSuggestions,
  fetchDeliveryQuote,
} from "@/lib/geo/client";
import type { DeliveryQuote, GeoAddressSuggestion } from "@/lib/geo/types";
import { buildTwoGisHref, buildYandexMapsHref } from "@/lib/map-links";

const serviceTruthLines = [
  "Подтверждаем маршрут и точку вручения до выбора блюд.",
  "Окно считаем по реальному пути, а не по красивому обещанию.",
  "Оплату и детали спокойно согласуем после подтверждения адреса.",
] as const;

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

function getScenarioTone(scenario: DeliveryScenario) {
  if (scenario.state === "out-of-zone") return "var(--error)";
  if (scenario.state === "cutoff") return "var(--warning)";
  return "var(--accent)";
}

function getScenarioStatusLabel(scenario: DeliveryScenario) {
  if (scenario.state === "out-of-zone") return "Вне покрытия";
  if (scenario.state === "cutoff") return "Следующее окно";
  return "Подходит сейчас";
}

function getDeliveryStateTone(state: DeliveryScenario["state"] | null | undefined) {
  if (state === "out-of-zone") return "var(--error)";
  if (state === "cutoff") return "var(--warning)";
  return "var(--accent)";
}

function mapQuoteSourceToDropoffSource(
  source: DeliveryQuote["address"]["source"],
): DeliveryScenario["confirmedDropoffSource"] {
  if (source === "manual") {
    return "operator_override";
  }

  return source;
}

function buildScenarioPinPreviews(scenario: DeliveryScenario): PinPreview[] {
  const basePin: PinPreview = {
    id: `${scenario.id}_default_dropoff`,
    label: "Основная точка",
    note: "Базовая точка вручения по подтверждённому адресу.",
    normalizedAddress: scenario.normalizedAddress,
    confirmedDropoffLabel: scenario.confirmedDropoffLabel,
    confirmedDropoffSource: scenario.confirmedDropoffSource,
    confirmedDropoffLat: scenario.confirmedDropoffLat,
    confirmedDropoffLng: scenario.confirmedDropoffLng,
    addressConfidence: scenario.addressConfidence,
    courierInstructions: scenario.courierInstructions,
    etaAdjustmentMinutes: 0,
  };

  const correctionPins = getDropoffCorrectionOptions(scenario.id)
    .filter(
      (option) =>
        option.confirmedDropoffLabel !== scenario.confirmedDropoffLabel ||
        option.confirmedDropoffLat !== scenario.confirmedDropoffLat ||
        option.confirmedDropoffLng !== scenario.confirmedDropoffLng,
    )
    .map(
      (option): PinPreview => ({
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
      }),
    );

  return [basePin, ...correctionPins];
}

function getQuoteModeLabel(mode: DeliveryQuote["meta"]["quoteMode"]) {
  return mode === "full" ? "Боевой расчет" : "Черновой расчет";
}

function getQuoteModeTone(mode: DeliveryQuote["meta"]["quoteMode"]) {
  return mode === "full" ? "var(--accent)" : "var(--warning)";
}

function getZoneProviderLabel(provider: DeliveryQuote["meta"]["zoneProvider"]) {
  return provider === "file" ? "Сервисные зоны" : "Временный контур";
}

function getRoutingProviderLabel(provider: DeliveryQuote["routing"]["provider"]) {
  if (provider === "tomtom") {
    return "TomTom";
  }

  if (provider === "2gis") {
    return "2GIS";
  }

  return "Сервисный контур";
}

function getServiceFormatLabel(source: DeliveryQuote["fulfillment"]["source"] | null | undefined) {
  if (source === "own_courier") {
    return "через собственную команду";
  }

  if (source === "overflow_provider") {
    return "через внешнего партнера";
  }

  return "после подтверждения маршрута";
}

function getTrafficModelLabel(model: DeliveryQuote["routing"]["trafficModel"]) {
  if (model === "live") {
    return "Живые пробки";
  }

  if (model === "historical") {
    return "Историческая модель";
  }

  return "Без трафика";
}

function formatRouteDistanceLabel(distanceMeters: number | null | undefined) {
  if (distanceMeters === null || distanceMeters === undefined) {
    return "Маршрут уточняем";
  }

  const distanceKm = distanceMeters / 1000;

  return `${distanceKm < 10 ? distanceKm.toFixed(1) : distanceKm.toFixed(0)} км`;
}

export function DeliveryAddressPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, resetDraft } = useDraft();

  const draftScenario =
    getDeliveryScenario(draft.serviceLabel) ??
    getDeliveryAddressSuggestions(draft.typedAddress || "")[0] ??
    getDeliveryScenario("delivery_tverskaya_7");

  const [query, setQuery] = useState(draft.typedAddress || draftScenario?.typedAddress || "");
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    draftScenario?.id ?? "delivery_tverskaya_7",
  );
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [liveAddressSuggestions, setLiveAddressSuggestions] = useState<GeoAddressSuggestion[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [activeQuote, setActiveQuote] = useState<DeliveryQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteContextMode, setQuoteContextMode] = useState<
    "scenario" | "live" | "map_pin" | null
  >(null);
  const quoteAbortRef = useRef<AbortController | null>(null);
  const quoteRequestSeqRef = useRef(0);
  const didBootstrapQuoteRef = useRef(false);

  const suggestSessionToken = useMemo(
    () =>
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "raki_site_session",
    [],
  );

  const featuredScenarios = useMemo(() => getDeliveryAddressSuggestions(""), []);
  const scenarioSuggestions = useMemo(() => {
    const direct = getDeliveryAddressSuggestions(query);
    return direct.length > 0 ? direct : featuredScenarios;
  }, [featuredScenarios, query]);

  const selectedScenario =
    scenarioSuggestions.find((scenario) => scenario.id === selectedScenarioId) ??
    getDeliveryScenario(selectedScenarioId) ??
    featuredScenarios[0];

  const runQuote = useCallback(
    async (
      input:
        | {
            mode: "scenario";
            scenario: DeliveryScenario;
          }
        | {
            mode: "live";
            suggestion: GeoAddressSuggestion;
          }
        | {
            mode: "map_pin";
            lat: number;
            lng: number;
            sourceAddressLabel: string | null;
          },
    ) => {
      const controller = new AbortController();
      const requestSeq = quoteRequestSeqRef.current + 1;
      quoteRequestSeqRef.current = requestSeq;

      quoteAbortRef.current?.abort();
      quoteAbortRef.current = controller;
      setIsQuoteLoading(true);
      setQuoteError(null);

      try {
        const quote =
          input.mode === "scenario"
            ? input.scenario.confirmedDropoffLat !== null &&
              input.scenario.confirmedDropoffLng !== null
              ? await fetchDeliveryQuote(
                  {
                    mode: "suggestion",
                    rawInput: input.scenario.typedAddress,
                    normalizedAddress:
                      input.scenario.normalizedAddress ?? input.scenario.typedAddress,
                    lat: input.scenario.confirmedDropoffLat,
                    lng: input.scenario.confirmedDropoffLng,
                    confidence: input.scenario.addressConfidence ?? "low",
                    sessionToken: suggestSessionToken,
                  },
                  { signal: controller.signal },
                )
              : null
            : input.mode === "live"
              ? input.suggestion.lat !== null && input.suggestion.lng !== null
                ? await fetchDeliveryQuote(
                    {
                      mode: "suggestion",
                      rawInput: query.trim() || input.suggestion.title,
                      normalizedAddress:
                        input.suggestion.normalizedAddress || input.suggestion.title,
                      lat: input.suggestion.lat,
                      lng: input.suggestion.lng,
                      confidence: input.suggestion.confidence,
                      sessionToken: suggestSessionToken,
                    },
                    { signal: controller.signal },
                  )
                : null
              : await fetchDeliveryQuote(
                  {
                    mode: "map_pin",
                    lat: input.lat,
                    lng: input.lng,
                    confidence: "medium",
                    sourceAddressLabel: input.sourceAddressLabel,
                    sessionToken: suggestSessionToken,
                  },
                  { signal: controller.signal },
                );

        if (controller.signal.aborted || requestSeq !== quoteRequestSeqRef.current) {
          return;
        }

        if (!quote) {
          setActiveQuote(null);
          setQuoteError("Для этого адреса сначала нужно уточнить координаты.");
          setIsQuoteLoading(false);
          return;
        }

        setActiveQuote(quote);
        setIsQuoteLoading(false);
      } catch (error) {
        if (controller.signal.aborted || requestSeq !== quoteRequestSeqRef.current) {
          return;
        }

        setActiveQuote(null);
        setIsQuoteLoading(false);
        setQuoteError(
          error instanceof Error ? error.message : "Не удалось рассчитать доставку.",
        );
      }
    },
    [query, suggestSessionToken],
  );

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 3) {
      setLiveAddressSuggestions([]);
      setIsSuggestionsLoading(false);
      setSuggestionsError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSuggestionsLoading(true);
      setSuggestionsError(null);

      try {
        const response = await fetchDeliveryAddressSuggestions(
          {
            query: trimmedQuery,
            sessionToken: suggestSessionToken,
          },
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setLiveAddressSuggestions(response.items);
          setIsSuggestionsLoading(false);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLiveAddressSuggestions([]);
        setIsSuggestionsLoading(false);
        setSuggestionsError(
          error instanceof Error ? error.message : "Не удалось получить подсказки адреса.",
        );
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, suggestSessionToken]);

  useEffect(() => {
    return () => {
      quoteAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!selectedScenario || didBootstrapQuoteRef.current) {
      return;
    }

    didBootstrapQuoteRef.current = true;
    setQuoteContextMode("scenario");
    void runQuote({
      mode: "scenario",
      scenario: selectedScenario,
    });
  }, [runQuote, selectedScenario]);

  const pinPreviews = useMemo(
    () => (selectedScenario ? buildScenarioPinPreviews(selectedScenario) : []),
    [selectedScenario],
  );
  const selectedPin = pinPreviews.find((pin) => pin.id === selectedPinId) ?? pinPreviews[0] ?? null;
  const hasCustomPinPreview =
    Boolean(selectedScenario) &&
    Boolean(selectedPin) &&
    selectedPin.id !== `${selectedScenario?.id}_default_dropoff`;

  const effectiveNormalizedAddress =
    hasCustomPinPreview
      ? selectedPin?.normalizedAddress ?? selectedScenario?.normalizedAddress ?? null
      : activeQuote?.address.normalizedAddress ??
        selectedPin?.normalizedAddress ??
        selectedScenario?.normalizedAddress ??
        null;
  const effectiveDropoffLabel =
    hasCustomPinPreview
      ? selectedPin?.confirmedDropoffLabel ?? selectedScenario?.confirmedDropoffLabel ?? null
      : activeQuote?.address.normalizedAddress ??
        selectedPin?.confirmedDropoffLabel ??
        selectedScenario?.confirmedDropoffLabel ??
        null;
  const effectiveDropoffSource =
    hasCustomPinPreview
      ? selectedPin?.confirmedDropoffSource ?? selectedScenario?.confirmedDropoffSource
      : activeQuote
        ? mapQuoteSourceToDropoffSource(activeQuote.address.source)
        : selectedPin?.confirmedDropoffSource ?? selectedScenario?.confirmedDropoffSource;
  const effectiveDropoffLat =
    hasCustomPinPreview
      ? selectedPin?.confirmedDropoffLat ?? selectedScenario?.confirmedDropoffLat ?? null
      : activeQuote?.address.lat ??
        selectedPin?.confirmedDropoffLat ??
        selectedScenario?.confirmedDropoffLat ??
        null;
  const effectiveDropoffLng =
    hasCustomPinPreview
      ? selectedPin?.confirmedDropoffLng ?? selectedScenario?.confirmedDropoffLng ?? null
      : activeQuote?.address.lng ??
        selectedPin?.confirmedDropoffLng ??
        selectedScenario?.confirmedDropoffLng ??
        null;
  const effectiveAddressConfidence =
    hasCustomPinPreview
      ? selectedPin?.addressConfidence ?? selectedScenario?.addressConfidence ?? null
      : activeQuote?.address.confidence ??
        selectedPin?.addressConfidence ??
        selectedScenario?.addressConfidence ??
        null;
  const effectiveCourierInstructions =
    selectedPin?.courierInstructions ?? selectedScenario?.courierInstructions ?? "";
  const activeDeliveryState = activeQuote?.zone.deliveryState ?? selectedScenario?.state ?? null;
  const activeZoneId = activeQuote?.zone.zoneId ?? selectedScenario?.zoneId ?? null;
  const activeFulfillmentSource =
    activeQuote?.fulfillment.source ?? selectedScenario?.fulfillmentSource ?? null;
  const routingEvaluationBase = evaluateRoutingAssignment({
    fulfillmentMode: "delivery",
    deliveryState: activeDeliveryState,
    zoneId: activeZoneId,
    typedAddress: activeQuote?.address.rawInput ?? selectedScenario?.typedAddress,
    normalizedAddress: effectiveNormalizedAddress,
    fulfillmentSource: activeFulfillmentSource,
    vipOverride: selectedScenario?.vipOverride,
    sensitiveRoute: selectedScenario?.sensitiveRoute,
  });

  const routingEvaluation = {
    ...routingEvaluationBase,
    locationId: activeQuote?.kitchen.kitchenId ?? routingEvaluationBase.locationId,
    servicePointId: activeQuote?.zone.servicePointId ?? routingEvaluationBase.servicePointId,
    legalEntityId: activeQuote?.zone.legalEntityId ?? routingEvaluationBase.legalEntityId,
    resolverNote: activeQuote?.zone.resolverNote ?? routingEvaluationBase.resolverNote,
  };

  const routingDisplay = getRoutingAssignmentDisplay(routingEvaluation);
  const fallbackEtaLabel = getDynamicDeliveryEtaLabel({
    locationId: routingEvaluation.locationId,
    zoneId: activeZoneId,
    deliveryState: activeDeliveryState,
    destinationLat: effectiveDropoffLat,
    destinationLng: effectiveDropoffLng,
    fallbackEtaLabel: selectedScenario ? getDeliveryScenarioEtaLabel(selectedScenario) : null,
    fulfillmentSource: activeFulfillmentSource,
    addressConfidence: effectiveAddressConfidence,
    vipOverride: selectedScenario?.vipOverride ?? false,
    sensitiveRoute: selectedScenario?.sensitiveRoute ?? false,
    etaAdjustmentMinutes: selectedPin?.etaAdjustmentMinutes ?? 0,
  });
  const etaLabel =
    hasCustomPinPreview || !activeQuote ? fallbackEtaLabel : activeQuote.eta.etaLabel;
  const showDiagnostics = searchParams.get("debug") === "1";
  const activeQuoteSummary =
    activeQuote && !hasCustomPinPreview
      ? activeQuote.eta.etaLabel
        ? `${activeQuote.eta.prepMinutes} минут готовим + ${
            activeQuote.routing.routeMinutesLive ?? "?"
          } минут везем${
            activeQuote.routing.provider !== "fallback"
              ? " с учетом дорожной обстановки."
              : " по расчетной дистанции."
          }`
        : activeDeliveryState === "out-of-zone"
          ? "Точка сейчас вне активной зоны доставки."
          : "Сначала проверяем маршрут и операционное окно."
      : null;
  const activeQuoteDiagnostics =
    activeQuote && !hasCustomPinPreview
      ? [
          {
            label: "Режим",
            value: getQuoteModeLabel(activeQuote.meta.quoteMode),
            tone: getQuoteModeTone(activeQuote.meta.quoteMode),
          },
          {
            label: "Роутинг",
            value: getRoutingProviderLabel(activeQuote.routing.provider),
            tone:
              activeQuote.routing.provider === "fallback"
                ? "var(--warning)"
                : "var(--accent)",
          },
          {
            label: "Трафик",
            value: getTrafficModelLabel(activeQuote.routing.trafficModel),
            tone:
              activeQuote.routing.trafficModel === "none"
                ? "var(--warning)"
                : "rgba(255,255,255,0.82)",
          },
          {
            label: "Зоны",
            value: getZoneProviderLabel(activeQuote.meta.zoneProvider),
            tone:
              activeQuote.meta.zoneProvider === "file"
                ? "var(--accent)"
                : "var(--warning)",
          },
          {
            label: "Источник",
            value:
              activeQuote.address.source === "map_pin"
                ? "Pin"
                : activeQuote.address.source === "suggestion"
                  ? "Suggest"
                  : "Manual",
            tone: "rgba(255,255,255,0.82)",
          },
          ...(activeQuote.debug?.providerLatencyMs !== null &&
          activeQuote.debug?.providerLatencyMs !== undefined
            ? [
                {
                  label: "Latency",
                  value: `${activeQuote.debug.providerLatencyMs} ms`,
                  tone: "rgba(255,255,255,0.82)",
                },
              ]
            : []),
        ]
      : [];

  const decision =
    hasCustomPinPreview || !activeQuote
      ? evaluateDeliveryPolicyDecision({
          deliveryState: activeDeliveryState,
          zoneId: activeZoneId,
          fulfillmentSource: activeFulfillmentSource,
          liveQuoteAmount: activeQuote?.pricing.liveDeliveryQuoteAmount ?? selectedScenario?.liveQuoteAmount ?? null,
          etaLabel,
          vipOverride: selectedScenario?.vipOverride ?? false,
          sensitiveRoute: selectedScenario?.sensitiveRoute ?? false,
        })
      : {
          decisionState: activeQuote.decision.decisionState,
          decisionNote: activeQuote.decision.decisionNote,
          guardrailCode: activeQuote.decision.guardrailCode,
        };

  const cutoffSlot =
    activeDeliveryState === "cutoff"
      ? getDefaultTimingSlotForContext({
          fulfillmentMode: "delivery",
          deliveryState: activeDeliveryState,
          zoneId: activeZoneId,
        })
      : null;

  const originLocation = getLocation(routingEvaluation.locationId);
  const zone = getZone(activeZoneId);
  const yandexMapsHref = buildYandexMapsHref({
    label: effectiveDropoffLabel ?? effectiveNormalizedAddress ?? selectedScenario.typedAddress,
    lat: effectiveDropoffLat,
    lng: effectiveDropoffLng,
  });
  const twoGisHref = buildTwoGisHref({
    label: effectiveDropoffLabel ?? effectiveNormalizedAddress ?? selectedScenario.typedAddress,
    lat: effectiveDropoffLat,
    lng: effectiveDropoffLng,
  });
  const routeMinutesLabel =
    activeQuote?.routing.routeMinutesLive !== null &&
    activeQuote?.routing.routeMinutesLive !== undefined
      ? `${activeQuote.routing.routeMinutesLive} мин в пути`
      : activeDeliveryState === "out-of-zone"
        ? "Вне частного контура"
        : "Маршрут уточняем";
  const routeDistanceLabel = formatRouteDistanceLabel(activeQuote?.routing.routeDistanceMeters);
  const guestFeeLabel =
    activeQuote?.pricing.guestFeeAmount !== null &&
    activeQuote?.pricing.guestFeeAmount !== undefined
      ? formatMoney(activeQuote.pricing.guestFeeAmount)
      : "По адресу";
  const minimumOrderLabel =
    activeQuote?.pricing.minimumOrderAmount !== null &&
    activeQuote?.pricing.minimumOrderAmount !== undefined
      ? activeQuote.pricing.minimumOrderAmount > 0
        ? `от ${formatMoney(activeQuote.pricing.minimumOrderAmount)}`
        : "Без порога"
      : "Без порога";
  const mapServiceLine =
    activeQuote?.decision.decisionNote ||
    routingEvaluation.resolverNote ||
    "Если важен конкретный вход или въезд, точку можно спокойно уточнить сразу на карте.";
  const mapAddressLine =
    effectiveDropoffLabel ??
    effectiveNormalizedAddress ??
    activeQuote?.address.normalizedAddress ??
    selectedScenario.typedAddress;
  const alternativePoints = pinPreviews.filter(
    (pin) =>
      pin.id !== selectedPin?.id &&
      pin.confirmedDropoffLat !== null &&
      pin.confirmedDropoffLng !== null,
  );

  const applyScenario = useCallback((scenario: DeliveryScenario) => {
    setSelectedScenarioId(scenario.id);
    setSelectedPinId(null);
    setQuery(scenario.typedAddress);
    setShowSuggestions(false);
    setQuoteContextMode("scenario");
    setQuoteError(null);

    void runQuote({
      mode: "scenario",
      scenario,
    });
  }, [runQuote]);

  const applyLiveSuggestion = useCallback((suggestion: GeoAddressSuggestion) => {
    const nextQuery = suggestion.normalizedAddress || suggestion.title;
    const matchedScenario = getDeliveryAddressSuggestions(nextQuery)[0];

    setQuery(nextQuery);
    setSelectedPinId(null);
    setShowSuggestions(false);
    setSuggestionsError(null);
    setQuoteContextMode("live");

    if (matchedScenario) {
      setSelectedScenarioId(matchedScenario.id);
    }

    void runQuote({
      mode: "live",
      suggestion,
    });
  }, [runQuote]);

  const handleMapPinCommit = useCallback(
    (next: { lat: number; lng: number; sourceAddressLabel: string | null }) => {
      setSelectedPinId(null);
      setShowSuggestions(false);
      setQuoteContextMode("map_pin");
      setQuoteError(null);

      void runQuote({
        mode: "map_pin",
        lat: next.lat,
        lng: next.lng,
        sourceAddressLabel: (
          next.sourceAddressLabel ??
          effectiveDropoffLabel ??
          effectiveNormalizedAddress ??
          query.trim()
        ) || null,
      });
    },
    [effectiveDropoffLabel, effectiveNormalizedAddress, query, runQuote],
  );

  const handleConfirm = useCallback(() => {
    if (!selectedScenario) return;

    resetDraft({
      fulfillmentMode: "delivery",
      deliveryState: activeDeliveryState,
      zoneId: activeZoneId,
      locationId: routingEvaluation.locationId,
      servicePointId: routingEvaluation.servicePointId,
      legalEntityId: routingEvaluation.legalEntityId,
      resolverNote: routingEvaluation.resolverNote,
      serviceLabel: activeQuote?.zone.zoneLabel ?? selectedScenario.label,
      serviceTimingLabel: etaLabel ?? "",
      typedAddress: activeQuote?.address.rawInput ?? selectedScenario.typedAddress,
      normalizedAddress: effectiveNormalizedAddress ?? "",
      confirmedDropoffLabel: effectiveDropoffLabel ?? "",
      confirmedDropoffSource: effectiveDropoffSource,
      confirmedDropoffLat: effectiveDropoffLat,
      confirmedDropoffLng: effectiveDropoffLng,
      addressConfidence: effectiveAddressConfidence,
      courierInstructions: effectiveCourierInstructions,
      deliveryFulfillmentSource: activeFulfillmentSource,
      deliveryVipOverride: selectedScenario.vipOverride ?? false,
      deliverySensitiveRoute: selectedScenario.sensitiveRoute ?? false,
      deliveryDecisionState: decision.decisionState,
      deliveryDecisionNote: decision.decisionNote,
      liveDeliveryQuoteAmount:
        activeQuote?.pricing.liveDeliveryQuoteAmount ?? selectedScenario.liveQuoteAmount,
      timingIntent: activeDeliveryState === "cutoff" ? "scheduled" : "asap",
      requestedTimeSlotId: cutoffSlot?.id ?? null,
      requestedTimeLabel:
        activeDeliveryState === "cutoff" ? cutoffSlot?.label ?? "" : "Как можно скорее",
      orderStage: "context",
    });

    startTransition(() => {
      router.push("/delivery/result");
    });
  }, [
    cutoffSlot?.id,
    cutoffSlot?.label,
    decision.decisionNote,
    decision.decisionState,
    effectiveAddressConfidence,
    effectiveCourierInstructions,
    effectiveDropoffLabel,
    effectiveDropoffLat,
    effectiveDropoffLng,
    effectiveDropoffSource,
    effectiveNormalizedAddress,
    etaLabel,
    activeDeliveryState,
    activeFulfillmentSource,
    activeQuote?.address.rawInput,
    activeQuote?.pricing.liveDeliveryQuoteAmount,
    activeQuote?.zone.zoneLabel,
    activeZoneId,
    resetDraft,
    router,
    routingEvaluation.legalEntityId,
    routingEvaluation.locationId,
    routingEvaluation.resolverNote,
    routingEvaluation.servicePointId,
    selectedScenario,
  ]);

  if (!selectedScenario) {
    return null;
  }

  return (
    <div className="flex" style={{ minHeight: "100vh", paddingTop: 80, alignItems: "stretch" }}>
      <div
        style={{
          width: "43%",
          backgroundColor: "var(--bg-elevated)",
          borderRight: "1px solid var(--border)",
          padding: "var(--space-xl) var(--space-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-lg)",
        }}
      >
        <ScrollReveal>
          <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
            Частный сервис
          </span>
          <h1 className="text-h1" style={{ marginBottom: "var(--space-sm)" }}>
            Назовите адрес.
          </h1>
          <p className="text-muted" style={{ maxWidth: 520 }}>
            Сначала подтверждаем маршрут, точку вручения и реальное окно по адресу. Каталог
            откроется уже под ваш сервис, без лишних обещаний.
          </p>
        </ScrollReveal>

        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              setSelectedPinId(null);
              setShowSuggestions(true);
              setSuggestionsError(null);
              setActiveQuote(null);
              setQuoteError(null);
              setQuoteContextMode(null);

              const nextSuggestions = getDeliveryAddressSuggestions(next);
              if (nextSuggestions[0]) {
                setSelectedScenarioId(nextSuggestions[0].id);
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Например, Тверская, 7 или Барвиха"
            style={{
              width: "100%",
              padding: "16px 20px",
              backgroundColor: "var(--bg)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 17,
            }}
          />

          <AnimatePresence>
            {showSuggestions ? (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                }}
              >
                {query.trim().length >= 3 ? (
                  <>
                    {isSuggestionsLoading ? (
                      <div
                        className="text-muted"
                        style={{ padding: "14px 18px", fontSize: 14 }}
                      >
                        Подтягиваем варианты адреса.
                      </div>
                    ) : null}

                    {!isSuggestionsLoading && liveAddressSuggestions.length > 0
                      ? liveAddressSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => applyLiveSuggestion(suggestion)}
                            style={{
                              width: "100%",
                              padding: "14px 18px",
                              textAlign: "left",
                              backgroundColor: "transparent",
                              borderBottom:
                                index === liveAddressSuggestions.length - 1
                                  ? "none"
                                  : "1px solid var(--border)",
                              cursor: "pointer",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "var(--space-sm)",
                                marginBottom: 4,
                              }}
                            >
                              <strong>{suggestion.title}</strong>
                              <span className="text-muted" style={{ fontSize: 13 }}>
                                {suggestion.confidence === "high"
                                  ? "Точный адрес"
                                  : suggestion.confidence === "medium"
                                    ? "Адрес уточняем"
                                    : "Нужна проверка"}
                              </span>
                            </div>
                            <div className="text-muted" style={{ fontSize: 14 }}>
                              {suggestion.subtitle ??
                                suggestion.normalizedAddress ??
                                "Подтверждение адреса продолжается"}
                            </div>
                          </button>
                        ))
                      : null}

                    {!isSuggestionsLoading && suggestionsError ? (
                      <div
                        className="text-muted"
                        style={{ padding: "14px 18px", fontSize: 14 }}
                      >
                        {suggestionsError}
                      </div>
                    ) : null}

                    {!isSuggestionsLoading &&
                    !suggestionsError &&
                    liveAddressSuggestions.length === 0 ? (
                      <div
                        className="text-muted"
                        style={{ padding: "14px 18px", fontSize: 14 }}
                      >
                        Подсказок пока не нашли. Попробуйте уточнить адрес.
                      </div>
                    ) : null}
                  </>
                ) : scenarioSuggestions.length > 0 ? (
                  scenarioSuggestions.map((scenario) => {
                    const active = scenario.id === selectedScenario.id;
                    const rowEta = getDynamicDeliveryEtaLabel({
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
                        onClick={() => applyScenario(scenario)}
                        style={{
                          width: "100%",
                          padding: "14px 18px",
                          textAlign: "left",
                          backgroundColor: active ? "rgba(99, 188, 197, 0.06)" : "transparent",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "var(--space-sm)",
                            marginBottom: 4,
                          }}
                        >
                          <strong>{scenario.typedAddress}</strong>
                          <span style={{ color: getScenarioTone(scenario), fontSize: 13 }}>
                            {rowEta ?? getScenarioStatusLabel(scenario)}
                          </span>
                        </div>
                        <div className="text-muted" style={{ fontSize: 14 }}>
                          {scenario.note}
                        </div>
                      </button>
                    );
                  })
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div
          style={{
            padding: "var(--space-lg) var(--space-lg) calc(var(--space-lg) + 4px)",
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "var(--space-sm)",
              marginBottom: "var(--space-md)",
            }}
          >
            <div>
              <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                Время
              </span>
              <strong style={{ fontSize: 24, color: getDeliveryStateTone(activeDeliveryState) }}>
                {isQuoteLoading ? "Проверяем" : etaLabel ?? "Уточняем"}
              </strong>
            </div>
            <div>
              <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                Можно сейчас
              </span>
              <strong style={{ fontSize: 18 }}>
                {getDeliveryDecisionLabel({
                  deliveryState: activeDeliveryState,
                  decisionState: decision.decisionState,
                })}
              </strong>
            </div>
            <div>
              <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                Точка
              </span>
              <div>{effectiveDropoffLabel ?? "Уточняем вручную"}</div>
            </div>
            <div>
              <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                Точность адреса
              </span>
              <div>
                {getAddressConfidenceLabel(effectiveAddressConfidence)} •{" "}
                {getDeliveryDropoffSourceLabel(effectiveDropoffSource)}
              </div>
            </div>
          </div>

          {isQuoteLoading ? (
            <div className="text-muted" style={{ marginBottom: "var(--space-md)", lineHeight: 1.7 }}>
              Проверяем доставку по выбранному адресу.
            </div>
          ) : null}

          {!isQuoteLoading && quoteError ? (
            <div
              style={{
                marginBottom: "var(--space-md)",
                padding: "var(--space-sm)",
                backgroundColor: "rgba(199, 105, 74, 0.08)",
                border: "1px solid var(--warning)",
                borderRadius: "var(--radius-md)",
                color: "var(--warning)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {quoteError}
            </div>
          ) : null}

          {activeQuoteSummary ? (
            <div className="text-muted" style={{ marginBottom: "var(--space-md)", lineHeight: 1.7 }}>
              {activeQuoteSummary}
            </div>
          ) : null}

          <div className="text-muted" style={{ lineHeight: 1.75, display: "grid", gap: 6 }}>
            {serviceTruthLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>

          {showDiagnostics && activeQuoteDiagnostics.length > 0 ? (
            <div
              style={{
                marginTop: "var(--space-md)",
                paddingTop: "var(--space-md)",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ marginBottom: "var(--space-xs)" }}>
                <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                  Техническая правда
                </span>
                <div className="text-muted" style={{ lineHeight: 1.6 }}>
                  Этот блок виден только в debug-режиме и нужен для сверки маршрута.
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)" }}>
                {activeQuoteDiagnostics.map((item) => (
                  <span
                    key={item.label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 11px",
                      borderRadius: 999,
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      background: "rgba(255, 255, 255, 0.03)",
                      color: item.tone,
                      fontSize: 13,
                      lineHeight: 1.2,
                    }}
                  >
                    <span style={{ opacity: 0.68 }}>{item.label}</span>
                    <strong style={{ fontWeight: 600, color: item.tone }}>{item.value}</strong>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: "var(--space-sm)" }}>
          <div>
            <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
              Частые точки
            </span>
            <div className="text-muted" style={{ lineHeight: 1.7 }}>
              Несколько спокойных ориентиров для старта. Потом можно уточнить вход, пост
              охраны или въезд прямо на карте.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "var(--space-sm)",
            }}
          >
            {featuredScenarios.slice(0, 4).map((scenario) => {
              const active = scenario.id === selectedScenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => applyScenario(scenario)}
                  style={{
                    padding: "var(--space-md)",
                    textAlign: "left",
                    backgroundColor: active ? "rgba(99, 188, 197, 0.08)" : "var(--bg)",
                    border: `1px solid ${active ? getScenarioTone(scenario) : "var(--border)"}`,
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: getScenarioTone(scenario),
                      marginBottom: "var(--space-2xs)",
                    }}
                  >
                    {getScenarioStatusLabel(scenario)}
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{scenario.label}</div>
                  <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.55 }}>
                    {scenario.note}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {pinPreviews.length > 1 ? (
          <div
            style={{
              display: "grid",
              gap: "var(--space-sm)",
            }}
          >
            <div>
              <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                Точка вручения
              </span>
              <strong style={{ fontSize: 18 }}>Если важен конкретный вход, уточним его сразу.</strong>
              <div className="text-muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
                Въезд, пост охраны или отдельный вход пересчитывают обещание по времени сразу, без
                звонков туда-сюда.
              </div>
            </div>

            <div style={{ display: "grid", gap: "var(--space-sm)" }}>
              {pinPreviews.map((pin) => {
                const active = pin.id === selectedPin?.id;
                const pinEta = getDynamicDeliveryEtaLabel({
                  locationId: routingEvaluation.locationId,
                  zoneId: activeZoneId,
                  deliveryState: activeDeliveryState,
                  destinationLat: pin.confirmedDropoffLat,
                  destinationLng: pin.confirmedDropoffLng,
                  fallbackEtaLabel: getDeliveryScenarioEtaLabel(selectedScenario),
                  fulfillmentSource: activeFulfillmentSource,
                  addressConfidence: pin.addressConfidence,
                  vipOverride: selectedScenario.vipOverride,
                  sensitiveRoute: selectedScenario.sensitiveRoute,
                  etaAdjustmentMinutes: pin.etaAdjustmentMinutes ?? 0,
                });

                return (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={() => setSelectedPinId(pin.id)}
                    style={{
                      padding: "var(--space-md)",
                      textAlign: "left",
                      backgroundColor: active ? "rgba(99, 188, 197, 0.08)" : "transparent",
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "var(--space-sm)",
                        marginBottom: 4,
                      }}
                    >
                      <strong>{pin.label}</strong>
                      <span style={{ color: "var(--accent)", fontSize: 13 }}>
                        {pinEta ?? "Уточняем"}
                      </span>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      {pin.confirmedDropoffLabel ?? "Точку уточняем вручную"}
                    </div>
                    <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.55 }}>
                      {pin.note}
                    </div>
                    {pin.courierInstructions ? (
                      <div
                        className="text-muted"
                        style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}
                      >
                        {pin.courierInstructions}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex" style={{ gap: "var(--space-sm)", marginTop: "auto", flexWrap: "wrap" }}>
          <button
            type="button"
            className="cta cta--primary"
            onClick={handleConfirm}
            disabled={isQuoteLoading || (quoteContextMode !== null && activeQuote === null)}
          >
            Подтвердить адрес
          </button>
            <button
              type="button"
              className="cta cta--ghost"
              onClick={() => router.push("/menu?fulfillment=delivery")}
            >
              Сначала посмотреть каталог
            </button>
        </div>
      </div>

      <div
        style={{
          width: "57%",
          backgroundColor: "var(--bg)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <DeliveryMaplibreCanvas
          focusKey={activeQuote?.requestId ?? `${selectedScenario.id}:${selectedPin?.id ?? "base"}`}
          kitchenLat={activeQuote?.kitchen.lat ?? originLocation?.lat ?? null}
          kitchenLng={activeQuote?.kitchen.lng ?? originLocation?.lng ?? null}
          kitchenLabel={activeQuote?.kitchen.kitchenLabel ?? routingDisplay.locationLabel}
          destinationLat={effectiveDropoffLat}
          destinationLng={effectiveDropoffLng}
          destinationLabel={effectiveDropoffLabel ?? effectiveNormalizedAddress}
          addressLine={mapAddressLine}
          serviceLine={mapServiceLine}
          zoneLabel={activeQuote?.zone.zoneLabel ?? zone?.label ?? null}
          etaLabel={isQuoteLoading ? "Проверяем адрес" : etaLabel}
          zoneGeometry={activeQuote?.zone.polygon ?? null}
          deliveryState={activeDeliveryState}
          alternativePins={alternativePoints.map((pin) => ({
            id: pin.id,
            label: pin.label,
            lat: pin.confirmedDropoffLat as number,
            lng: pin.confirmedDropoffLng as number,
          }))}
          isRequoting={isQuoteLoading}
          onDestinationCommit={handleMapPinCommit}
        />


        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            gap: "var(--space-lg)",
            padding: "var(--space-xl)",
          }}
        >
          <div
            style={{
              marginLeft: "auto",
              width: 440,
              maxWidth: "100%",
              padding: "var(--space-lg)",
              backgroundColor: "rgba(15, 26, 34, 0.72)",
              backdropFilter: "blur(14px)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
              Частное обслуживание по адресу
            </span>
            <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: "var(--space-sm)" }}>
              {isQuoteLoading ? "Проверяем адрес" : etaLabel ?? "Время уточняем"}
            </h2>
            <div className="text-muted" style={{ marginBottom: "var(--space-md)", lineHeight: 1.75 }}>
              {mapAddressLine}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "var(--space-sm)",
                marginBottom: "var(--space-md)",
              }}
            >
              <div>
                <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                  Активная кухня
                </span>
                <strong>{routingDisplay.locationLabel}</strong>
              </div>
              <div>
                <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                  Маршрут
                </span>
                <strong>{routeMinutesLabel}</strong>
                <div className="text-muted" style={{ marginTop: 4 }}>
                  {routeDistanceLabel}
                </div>
              </div>
              <div>
                <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                  Сбор по адресу
                </span>
                <strong>{guestFeeLabel}</strong>
              </div>
              <div>
                <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                  Минимальный заказ
                </span>
                <strong>{minimumOrderLabel}</strong>
              </div>
            </div>
            <div className="text-muted" style={{ display: "grid", gap: 8, lineHeight: 1.7 }}>
              <span>Подача {getServiceFormatLabel(activeFulfillmentSource)}</span>
              {effectiveCourierInstructions ? <span>{effectiveCourierInstructions}</span> : null}
              <span>{mapServiceLine}</span>
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
        </div>
      </div>
    </div>
  );
}

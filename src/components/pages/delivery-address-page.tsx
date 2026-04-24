"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DeliveryMaplibreCanvas,
  type DeliveryMapViewportPolicy,
} from "@/components/maps/delivery-maplibre-canvas";
import { MapErrorBoundary } from "@/components/maps/map-error-boundary";
import { useDraft } from "@/components/draft-provider";
import { useRaceGuardedAsync } from "@/hooks/use-race-guarded-async";
import { canConfirmDeliveryAddress } from "@/lib/geo/can-confirm";
import {
  fetchDeliveryAddressSuggestions,
  fetchDeliveryQuote,
  fetchDeliveryReverse,
} from "@/lib/geo/client";
import type {
  DeliveryQuote,
  GeoAddressConfidence,
  GeoAddressSuggestion,
} from "@/lib/geo/types";
import { getDefaultTimingSlotForContext, getLocation } from "@/lib/fixtures";
import { generateId } from "@/lib/ids";

// Empty-state visual baseline: kitchen marker is shown even before any address
// is committed, so the user sees "we exist there" without us pretending to
// already know their destination.
const DEFAULT_KITCHEN_ID = "loc_lesnoy_01";
const SUGGEST_DEBOUNCE_MS = 220;
const QUERY_MIN_LENGTH = 3;

type CommittedAddress = {
  lat: number;
  lng: number;
  normalizedAddress: string;
  confidence: GeoAddressConfidence;
  source: "suggestion" | "map_pin";
};

type ConfidenceVariant = "loading" | "high" | "medium" | "low";

type ConfidenceDescriptor = {
  text: string;
  variant: ConfidenceVariant;
};

function describeConfidence(
  committed: CommittedAddress | null,
  isReverseLoading: boolean,
): ConfidenceDescriptor | null {
  if (!committed) return null;
  if (isReverseLoading) {
    return { text: "Уточняем адрес", variant: "loading" };
  }
  if (committed.confidence === "high") {
    return { text: "Адрес подтверждён", variant: "high" };
  }
  if (committed.confidence === "medium") {
    return { text: "Уточняем адрес", variant: "medium" };
  }
  return { text: "Допишите подъезд или номер дома", variant: "low" };
}

// Copy for the status strip. Broken out so the 7-way predicate chain reads
// top-to-bottom once, instead of nested ternaries at every use-site.
type RouteCopyInput = {
  committed: CommittedAddress | null;
  isQuoteLoading: boolean;
  quoteError: string | null;
  activeQuote: DeliveryQuote | null;
  isOutOfZone: boolean;
  isCutoff: boolean;
};

function getRouteCopy(input: RouteCopyInput): { headline: string; note: string } {
  const { committed, isQuoteLoading, quoteError, activeQuote, isOutOfZone, isCutoff } = input;

  if (!committed) {
    return { headline: "Поставьте точку на карте.", note: "" };
  }
  if (isQuoteLoading) {
    return { headline: "Считаем маршрут.", note: "Уточняем зону и время." };
  }
  if (quoteError) {
    return { headline: "Маршрут не рассчитан.", note: quoteError };
  }
  if (!activeQuote) {
    return { headline: "Проверьте адрес.", note: "Проверьте адрес." };
  }
  if (isOutOfZone) {
    return {
      headline: "Сюда пока не возим.",
      note: "Выберите другой адрес или перейдите в самовывоз.",
    };
  }
  if (isCutoff) {
    return { headline: "Сегодня уже не успеем.", note: "Покажем следующее окно." };
  }
  return {
    headline: activeQuote.eta.etaLabel ?? "Доставим сегодня.",
    note: activeQuote.meta.quoteMode === "degraded" ? "Время примерное." : "Адрес подтверждён.",
  };
}

export function DeliveryAddressPage() {
  const router = useRouter();
  const { draft, patchDraft } = useDraft();

  // Bootstrap from draft only when the user truly has a saved address.
  // Otherwise we open in the silent-canvas empty state.
  const initialCommitted = useMemo<CommittedAddress | null>(() => {
    if (
      draft.confirmedDropoffLat !== null &&
      draft.confirmedDropoffLng !== null &&
      draft.normalizedAddress
    ) {
      return {
        lat: draft.confirmedDropoffLat,
        lng: draft.confirmedDropoffLng,
        normalizedAddress: draft.normalizedAddress,
        confidence: draft.addressConfidence ?? "low",
        source:
          draft.confirmedDropoffSource === "map_pin" ? "map_pin" : "suggestion",
      };
    }
    return null;
  }, [
    draft.addressConfidence,
    draft.confirmedDropoffLat,
    draft.confirmedDropoffLng,
    draft.confirmedDropoffSource,
    draft.normalizedAddress,
  ]);

  const [committed, setCommitted] = useState<CommittedAddress | null>(
    initialCommitted,
  );
  const [query, setQuery] = useState(
    draft.typedAddress || initialCommitted?.normalizedAddress || "",
  );
  const [liveSuggestions, setLiveSuggestions] = useState<GeoAddressSuggestion[]>([]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [activeQuote, setActiveQuote] = useState<DeliveryQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [viewportPolicy, setViewportPolicy] =
    useState<DeliveryMapViewportPolicy>("fit-bounds");

  const [isReverseLoading, setIsReverseLoading] = useState(false);
  const [instructions, setInstructions] = useState(draft.courierInstructions || "");
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Independent race-guards: suggest, reverse and quote can fire interleaved
  // (e.g. user types while drag is in-flight). Each hook owns its own abort
  // slot + sequence counter, and aborts on unmount automatically.
  const runSuggest = useRaceGuardedAsync();
  const runReverse = useRaceGuardedAsync();
  const runQuoteGuarded = useRaceGuardedAsync();
  const didBootstrapRef = useRef(false);

  const sessionToken = useMemo(generateId, []);

  const defaultKitchen = useMemo(() => getLocation(DEFAULT_KITCHEN_ID), []);
  const kitchenLat =
    activeQuote?.kitchen.lat ?? defaultKitchen?.lat ?? null;
  const kitchenLng =
    activeQuote?.kitchen.lng ?? defaultKitchen?.lng ?? null;
  const kitchenLabel =
    activeQuote?.kitchen.kitchenLabel ?? defaultKitchen?.name ?? null;

  // ---- Suggest (debounced) ----------------------------------------------
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < QUERY_MIN_LENGTH) {
      setLiveSuggestions([]);
      setIsSuggestLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSuggestLoading(true);
      void runSuggest(
        (signal) =>
          fetchDeliveryAddressSuggestions(
            { query: trimmed, sessionToken },
            { signal },
          ),
        {
          onSuccess: (res) => setLiveSuggestions(res.items),
          onError: () => setLiveSuggestions([]),
          onSettled: (isLatest) => {
            if (isLatest) setIsSuggestLoading(false);
          },
        },
      );
    }, SUGGEST_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [query, runSuggest, sessionToken]);

  // ---- Quote ------------------------------------------------------------
  const runQuote = useCallback(
    (
      address: CommittedAddress,
      opts: { policy: DeliveryMapViewportPolicy },
    ) => {
      setIsQuoteLoading(true);
      setQuoteError(null);
      setViewportPolicy(opts.policy);
      void runQuoteGuarded(
        (signal) =>
          fetchDeliveryQuote(
            address.source === "suggestion"
              ? {
                  mode: "suggestion",
                  rawInput: address.normalizedAddress,
                  normalizedAddress: address.normalizedAddress,
                  lat: address.lat,
                  lng: address.lng,
                  confidence: address.confidence,
                  sessionToken,
                }
              : {
                  mode: "map_pin",
                  lat: address.lat,
                  lng: address.lng,
                  confidence: address.confidence,
                  sourceAddressLabel: address.normalizedAddress || null,
                  sessionToken,
                },
            { signal },
          ),
        {
          onSuccess: (quote) => setActiveQuote(quote),
          onError: () => {
            setActiveQuote(null);
            setQuoteError("Не удалось рассчитать маршрут. Попробуйте ещё раз.");
          },
          onSettled: (isLatest) => {
            if (isLatest) setIsQuoteLoading(false);
          },
        },
      );
    },
    [runQuoteGuarded, sessionToken],
  );

  // Bootstrap a single quote when restoring a saved address from the draft.
  // MUST fire at most once and only for the initial draft-restored address —
  // if we re-trigger on every `committed` change, interactive commits
  // (geolocation, drag, suggest) double-run the quote with `policy:"fit-bounds"`,
  // which overrides the caller-chosen "preserve" / "fly-to" and yanks the
  // viewport. Hence deps [] + closure over `initialCommitted`.
  useEffect(() => {
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;
    if (!initialCommitted) return;
    runQuote(initialCommitted, { policy: "fit-bounds" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Suggestion pick: commit + flyTo + quote --------------------------
  const applySuggestion = useCallback(
    (suggestion: GeoAddressSuggestion) => {
      if (suggestion.lat === null || suggestion.lng === null) return;
      const next: CommittedAddress = {
        lat: suggestion.lat,
        lng: suggestion.lng,
        normalizedAddress: suggestion.normalizedAddress || suggestion.title,
        confidence: suggestion.confidence,
        source: "suggestion",
      };
      setCommitted(next);
      setQuery(next.normalizedAddress);
      setShowSuggestions(false);
      setLiveSuggestions([]);
      runQuote(next, { policy: "fly-to" });
    },
    [runQuote],
  );

  // ---- Drag pin commit: optimistic quote + reverse upgrade --------------
  const handleMapPinCommit = useCallback(
    (commit: {
      lat: number;
      lng: number;
      sourceAddressLabel: string | null;
    }) => {
      // Optimistic: confirm coordinates immediately so the quote starts in
      // parallel with the reverse-geocode. The user sees the zone redraw
      // without waiting for an address string. A friendly placeholder is
      // used while reverse is in flight — raw "55.76123, 37.60948" in the
      // address input would read as a bug next to the "Допишите подъезд" hint.
      const optimistic: CommittedAddress = {
        lat: commit.lat,
        lng: commit.lng,
        normalizedAddress:
          commit.sourceAddressLabel || query.trim() || "Точка на карте",
        confidence: "low",
        source: "map_pin",
      };
      setCommitted(optimistic);
      runQuote(optimistic, { policy: "preserve" });

      setIsReverseLoading(true);
      void runReverse(
        (signal) =>
          fetchDeliveryReverse(
            { lat: commit.lat, lng: commit.lng, sessionToken },
            { signal },
          ),
        {
          onSuccess: (res) => {
            if (!res.address) return;
            const upgraded: CommittedAddress = {
              lat: commit.lat,
              lng: commit.lng,
              normalizedAddress:
                res.address.normalizedAddress || res.address.title,
              confidence: res.address.confidence,
              source: "map_pin",
            };
            setCommitted(upgraded);
            setQuery(upgraded.normalizedAddress);
          },
          // Reverse failure stays silent — user keeps the optimistic coords with
          // confidence "low" and sees the "Допишите подъезд" hint.
          onSettled: (isLatest) => {
            if (isLatest) setIsReverseLoading(false);
          },
        },
      );
    },
    [query, runQuote, runReverse, sessionToken],
  );

  // ---- Geolocation (no Moscow bounds-guard — see plan §7) ---------------
  const handleGeolocate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Ваш браузер не поддерживает геолокацию.");
      return;
    }
    setGeoError(null);
    setIsGeolocating(true);

    // Watchdog: navigator.geolocation.getCurrentPosition can silently never
    // call back if a browser extension (TronLink / MetaMask) shims navigator
    // or the user's permission is "prompt" but the dialog was dismissed.
    // Without this the "Ищем точку" button stays disabled forever.
    let settled = false;
    const watchdog = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setIsGeolocating(false);
      setGeoError(
        "Не удалось определить позицию. Разрешите геолокацию или введите адрес вручную.",
      );
    }, 7000);

    const finish = (error: string | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      setIsGeolocating(false);
      setGeoError(error);
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        finish(null);
        handleMapPinCommit({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          sourceAddressLabel: null,
        });
      },
      (err) => {
        // Browser-provided error codes: 1 = PERMISSION_DENIED,
        // 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT.
        if (err.code === err.PERMISSION_DENIED) {
          finish(
            "Геолокация заблокирована. Разрешите её в настройках сайта или введите адрес вручную.",
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          finish("Не удалось определить позицию. Введите адрес вручную.");
        } else {
          finish("Геолокация не ответила. Попробуйте ещё раз или введите адрес.");
        }
      },
      { timeout: 5000, maximumAge: 60_000 },
    );
  }, [handleMapPinCommit]);

  // ---- Confirm: write to Draft ------------------------------------------
  const isOutOfZone = activeQuote?.zone.deliveryState === "out-of-zone";
  const canConfirm = canConfirmDeliveryAddress({
    committed,
    activeQuote,
    isQuoteLoading,
    isReverseLoading,
  });

  const handleConfirm = useCallback(() => {
    if (!committed || !activeQuote) return;
    setIsConfirming(true);

    const cutoffSlot =
      activeQuote.zone.deliveryState === "cutoff"
        ? getDefaultTimingSlotForContext({
            fulfillmentMode: "delivery",
            deliveryState: activeQuote.zone.deliveryState,
            zoneId: activeQuote.zone.zoneId,
            locationId: activeQuote.kitchen.kitchenId,
            servicePointId: activeQuote.zone.servicePointId,
          })
        : null;

    patchDraft({
      fulfillmentMode: "delivery",
      deliveryState: activeQuote.zone.deliveryState,
      zoneId: activeQuote.zone.zoneId,
      locationId: activeQuote.kitchen.kitchenId,
      servicePointId: activeQuote.zone.servicePointId,
      legalEntityId: activeQuote.zone.legalEntityId,
      resolverNote: activeQuote.zone.resolverNote,
      serviceLabel: activeQuote.zone.zoneLabel ?? "Доставка",
      serviceTimingLabel: activeQuote.eta.etaLabel ?? "",
      typedAddress: query.trim() || committed.normalizedAddress,
      normalizedAddress: committed.normalizedAddress,
      confirmedDropoffLabel: committed.normalizedAddress,
      confirmedDropoffSource: committed.source,
      confirmedDropoffLat: committed.lat,
      confirmedDropoffLng: committed.lng,
      addressConfidence: committed.confidence,
      courierInstructions: instructions.trim(),
      deliveryFulfillmentSource: activeQuote.fulfillment.source,
      deliveryDecisionState: activeQuote.decision.decisionState,
      deliveryDecisionNote: activeQuote.decision.decisionNote,
      liveDeliveryQuoteAmount:
        activeQuote.pricing.liveDeliveryQuoteAmount ?? activeQuote.pricing.guestFeeAmount,
      timingIntent:
        activeQuote.zone.deliveryState === "cutoff" ? "scheduled" : "asap",
      requestedTimeSlotId: cutoffSlot?.id ?? null,
      requestedTimeLabel:
        activeQuote.zone.deliveryState === "cutoff"
          ? cutoffSlot?.label ?? ""
          : "Как можно скорее",
      orderStage: "context",
    });

    startTransition(() => router.push("/delivery/result"));
  }, [activeQuote, committed, instructions, patchDraft, query, router]);

  // ---- Derived UI strings ------------------------------------------------
  const confidence = describeConfidence(committed, isReverseLoading);
  const focusKey = committed
    ? `${committed.lat.toFixed(5)}_${committed.lng.toFixed(5)}_${committed.source}`
    : "empty";

  const isCutoff = activeQuote?.zone.deliveryState === "cutoff";
  const routeMinutesLabel =
    typeof activeQuote?.routing.routeMinutesLive === "number"
      ? `${activeQuote.routing.routeMinutesLive} мин`
      : "уточним";
  const deliveryQuoteAmount =
    activeQuote?.pricing.liveDeliveryQuoteAmount ?? activeQuote?.pricing.guestFeeAmount ?? null;
  const quoteAmountLabel =
    typeof deliveryQuoteAmount === "number"
      ? `${new Intl.NumberFormat("ru-RU").format(deliveryQuoteAmount)} ₽`
      : "уточним";
  const { headline: routeHeadline, note: routeNote } = getRouteCopy({
    committed,
    isQuoteLoading,
    quoteError,
    activeQuote,
    isOutOfZone: !!isOutOfZone,
    isCutoff: !!isCutoff,
  });
  const serviceRows = activeQuote
    ? [
        {
          label: "Адрес",
          value: committed?.normalizedAddress ?? activeQuote.address.normalizedAddress,
        },
        {
          label: "Зона",
          value: activeQuote.zone.zoneLabel ?? "Доставка",
        },
        {
          label: "Кухня",
          value: activeQuote.kitchen.kitchenLabel ?? kitchenLabel ?? "Осоргино, 202",
        },
        {
          label: "Маршрут",
          value: routeMinutesLabel,
        },
        {
          label: "Стоимость",
          value: quoteAmountLabel,
        },
      ]
    : [];
  const ctaLabel = isConfirming
    ? "Подтверждаем адрес"
    : isOutOfZone
      ? "Сейчас не везём"
      : "Подтвердить адрес";

  return (
    <main className="delivery-editorial">
      <div className="menu-editorial__controls delivery-editorial__controls">
        <Link href="/" className="menu-editorial__control menu-editorial__control--menu">
          <span className="product-editorial__back-arrow" aria-hidden>
            ←
          </span>
          <span>Главная</span>
        </Link>

        <div className="menu-editorial__control-stack">
          <Link href="/pickup" className="menu-editorial__control">
            <span>Самовывоз</span>
          </Link>
        </div>
      </div>

      <div className="delivery-editorial__shell">
        <section className="delivery-editorial__panel">
          <div className="delivery-editorial__panel-inner">
            <div className="delivery-editorial__body">
            <header className="delivery-editorial__header">
              <span className="delivery-editorial__brand">The Raki</span>
              <span className="delivery-editorial__eyebrow">Доставка</span>
              <h1 className="delivery-editorial__title">Куда везти заказ?</h1>
              <p className="delivery-editorial__lead">Укажите адрес доставки.</p>
            </header>

            <div className="delivery-editorial__field-shell">
              <label htmlFor="delivery-address-input" className="delivery-editorial__field-label">
                Адрес доставки
              </label>
              <input
                id="delivery-address-input"
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setShowSuggestions(false);
                  }
                  if (event.key === "Enter" && liveSuggestions[0]) {
                    event.preventDefault();
                    applySuggestion(liveSuggestions[0]);
                  }
                }}
                placeholder="Москва, улица, дом"
                aria-describedby={confidence ? "address-confidence" : undefined}
                autoComplete="street-address"
                className="delivery-editorial__input"
              />

              {(showSuggestions || isSuggestLoading) &&
                (liveSuggestions.length > 0 || isSuggestLoading) ? (
                  <div
                    role="listbox"
                    aria-label="Подсказки адреса"
                    className="delivery-editorial__suggestions"
                  >
                    {isSuggestLoading && liveSuggestions.length === 0 ? (
                      <div className="delivery-editorial__suggestion delivery-editorial__suggestion--loading">
                        Ищем адрес.
                      </div>
                    ) : (
                      liveSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => applySuggestion(suggestion)}
                          role="option"
                          aria-selected="false"
                          className="delivery-editorial__suggestion"
                        >
                          <strong>{suggestion.title}</strong>
                          {suggestion.subtitle ? <span>{suggestion.subtitle}</span> : null}
                        </button>
                      ))
                    )}
                  </div>
                ) : null}

              {showSuggestions &&
              !isSuggestLoading &&
              query.trim().length >= QUERY_MIN_LENGTH &&
              liveSuggestions.length === 0 ? (
                <div className="delivery-editorial__field-empty">
                  Адрес не нашли. Поставьте точку на карте.
                </div>
              ) : null}
            </div>

            <div className="delivery-editorial__meta-row">
              {confidence ? (
                <span
                  id="address-confidence"
                  aria-live="polite"
                  className={`delivery-editorial__confidence ${
                    confidence.variant === "loading"
                      ? "delivery-editorial__confidence--quiet"
                      : `delivery-editorial__confidence--${confidence.variant}`
                  }`}
                >
                  {confidence.text}
                </span>
              ) : null}

              <button
                type="button"
                onClick={handleGeolocate}
                disabled={isGeolocating}
                aria-label="Использовать мою позицию"
                className="delivery-editorial__geo-button"
              >
                {isGeolocating ? "Ищем точку" : "Моя точка"}
              </button>
            </div>

            {geoError ? (
              <div
                role="alert"
                className="delivery-editorial__field-empty"
                style={{ color: "#cc6363" }}
              >
                {geoError}
              </div>
            ) : null}

            <div className="delivery-editorial__status-shell" aria-live="polite" aria-atomic="true">
              <span className="delivery-editorial__field-label">Сейчас</span>
              <strong>{routeHeadline}</strong>
              {routeNote ? <p>{routeNote}</p> : null}
            </div>

            {serviceRows.length > 0 ? (
              <div className="delivery-editorial__facts">
                {serviceRows.map((row) => (
                  <div key={row.label} className="delivery-editorial__fact">
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            {committed ? (
              <div className="delivery-editorial__textarea-shell">
                <label htmlFor="courier-instructions" className="delivery-editorial__field-label">
                  Подъезд, домофон, особые пометки
                </label>
                <textarea
                  id="courier-instructions"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  rows={2}
                  className="delivery-editorial__textarea"
                />
              </div>
            ) : null}
            </div>

            <div className="delivery-editorial__footer">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm || isConfirming}
                aria-disabled={!canConfirm || isConfirming}
                className="delivery-editorial__cta"
              >
                {ctaLabel}
              </button>

              <div className="delivery-editorial__attribution">© OpenFreeMap · © OSM</div>
            </div>
          </div>
        </section>

        <section className="delivery-editorial__map-shell">
          <MapErrorBoundary
            fallback={
              <div className="delivery-editorial__map-fallback" role="status">
                <p>
                  Карта временно недоступна. Продолжайте вводить адрес —
                  мы подтвердим маршрут после оформления.
                </p>
              </div>
            }
          >
            <DeliveryMaplibreCanvas
              focusKey={focusKey}
              kitchenLat={kitchenLat}
              kitchenLng={kitchenLng}
              kitchenLabel={kitchenLabel}
              destinationLat={committed?.lat ?? null}
              destinationLng={committed?.lng ?? null}
              destinationLabel={committed?.normalizedAddress ?? null}
              zoneGeometry={activeQuote?.zone.polygon ?? null}
              deliveryState={activeQuote?.zone.deliveryState ?? null}
              isRequoting={isQuoteLoading || isReverseLoading}
              viewportPolicy={viewportPolicy}
              onDestinationCommit={handleMapPinCommit}
            />
          </MapErrorBoundary>
        </section>
      </div>
    </main>
  );
}

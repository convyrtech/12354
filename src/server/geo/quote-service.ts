import type {
  DeliveryQuote,
  DeliveryQuoteRequest,
  RoutingQuote,
} from "@/lib/geo/types";
import {
  evaluateDeliveryPolicyDecision,
  getDeliveryPolicy,
} from "@/lib/delivery-policy";
import { findNearestActiveKitchen, getLocation } from "@/lib/fixtures";
import { generateId } from "@/lib/ids";
import { getGeoRuntimeConfig } from "@/server/geo/config";
import { GeoValidationError } from "@/server/geo/errors";
import { quoteRoute } from "@/server/geo/routing-service";
import { findZone } from "@/server/geo/zone-service";

// ETA = cook + route + handoff. Premium audience never sees decomposition;
// label is "Будем у вас к HH:MM" formatted in Moscow time.
const COOK_MINUTES = 20;
const HANDOFF_MINUTES = 10;
const SPREAD_MINUTES = 15;
// Sanity cap — if the route quote says >3 hours, something is wrong (stale
// draft with foreign coords, misrouted kitchen, Haversine overshoot). Showing
// "Будем у вас к 08:27" (24h modulo) is worse than hiding the label entirely.
const MAX_REASONABLE_ROUTE_MINUTES = 180;

// Stateless; sharing one formatter avoids allocating on every quote request.
const MOSCOW_HHMM_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Moscow",
});

function createRequestId() {
  return `quote_${generateId()}`;
}

export function formatMoscowArrivalLabel(minutesFromNow: number): string {
  const arrival = new Date(Date.now() + minutesFromNow * 60_000);
  return `Будем у вас к ${MOSCOW_HHMM_FORMATTER.format(arrival)}`;
}

export function buildEta(input: {
  routeMinutesLive: number | null;
  deliveryState: DeliveryQuote["zone"]["deliveryState"];
}) {
  if (
    input.deliveryState === "out-of-zone" ||
    input.routeMinutesLive === null ||
    input.routeMinutesLive > MAX_REASONABLE_ROUTE_MINUTES
  ) {
    return {
      cookMinutes: COOK_MINUTES,
      handoffMinutes: HANDOFF_MINUTES,
      etaMinMinutes: null,
      etaMaxMinutes: null,
      etaLabel: null,
    };
  }

  const etaMinMinutes =
    COOK_MINUTES + input.routeMinutesLive + HANDOFF_MINUTES;
  const etaMaxMinutes = etaMinMinutes + SPREAD_MINUTES;

  return {
    cookMinutes: COOK_MINUTES,
    handoffMinutes: HANDOFF_MINUTES,
    etaMinMinutes,
    etaMaxMinutes,
    etaLabel: formatMoscowArrivalLabel(etaMinMinutes),
  };
}

function buildEmptyRoutingQuote(provider: RoutingQuote["provider"] = "fallback"): RoutingQuote {
  return {
    provider,
    routeMinutesLive: null,
    routeDistanceMeters: null,
    trafficModel: "none",
    quotedAt: new Date().toISOString(),
  };
}

function buildRawInput(request: DeliveryQuoteRequest) {
  if (request.mode === "suggestion") {
    return request.rawInput.trim();
  }

  return request.sourceAddressLabel?.trim() || "Точка на карте";
}

function buildNormalizedAddress(request: DeliveryQuoteRequest) {
  if (request.mode === "suggestion") {
    return request.normalizedAddress.trim();
  }

  return request.sourceAddressLabel?.trim() || "Точка на карте";
}

export async function buildDeliveryQuote(
  request: DeliveryQuoteRequest,
  options?: { signal?: AbortSignal },
): Promise<DeliveryQuote> {
  if (!Number.isFinite(request.lat) || !Number.isFinite(request.lng)) {
    throw new GeoValidationError("Coordinates are required for quote.");
  }

  const config = getGeoRuntimeConfig();

  const zone = await findZone(
    {
      lat: request.lat,
      lng: request.lng,
    },
    { signal: options?.signal },
  );

  // Override the zone's default kitchen with the geographically closest
  // active one, so the demo visibly routes to Реутов for an east-Moscow
  // address and to Осоргино for a west-Moscow one. When the zone resolver
  // returns no kitchen (out-of-zone) we leave the override null so the
  // route stays empty.
  const nearest =
    zone.deliveryState === "out-of-zone"
      ? null
      : findNearestActiveKitchen({ lat: request.lat, lng: request.lng });
  const resolvedKitchenId = nearest?.id ?? zone.kitchenId;
  const kitchenLocation = nearest ?? getLocation(zone.kitchenId);
  let providerLatencyMs: number | null = null;

  const routing =
    resolvedKitchenId && kitchenLocation?.lat !== undefined && kitchenLocation?.lng !== undefined
      ? await (async () => {
          const startedAt = Date.now();
          const result = await quoteRoute(
            {
              originLat: kitchenLocation.lat,
              originLng: kitchenLocation.lng,
              destinationLat: request.lat,
              destinationLng: request.lng,
              sessionToken: request.sessionToken,
            },
            {
              config,
              signal: options?.signal,
            },
          );
          providerLatencyMs = Date.now() - startedAt;

          return result;
        })()
      : buildEmptyRoutingQuote();

  const policy = getDeliveryPolicy(zone.zoneId);
  const fulfillmentSource =
    zone.deliveryState === "out-of-zone" ? null : "own_courier";
  const pricing = {
    guestFeeAmount: policy?.guestFeeAmount ?? null,
    liveDeliveryQuoteAmount: null,
    minimumOrderAmount: policy?.minimumOrderAmount ?? null,
  };
  const eta = buildEta({
    routeMinutesLive: routing.routeMinutesLive,
    deliveryState: zone.deliveryState,
  });
  const decision = evaluateDeliveryPolicyDecision({
    deliveryState: zone.deliveryState,
    zoneId: zone.zoneId,
    fulfillmentSource,
    liveQuoteAmount: pricing.liveDeliveryQuoteAmount,
    etaLabel: eta.etaLabel,
    vipOverride: false,
    sensitiveRoute: false,
  });
  const resolvedAt = new Date().toISOString();
  const hasTruthfulZoneSource = config.zoneProvider === "file";
  const hasTruthfulRouting =
    zone.deliveryState === "out-of-zone" || routing.provider !== "fallback";
  const quoteMode = hasTruthfulZoneSource && hasTruthfulRouting ? "full" : "degraded";

  return {
    requestId: createRequestId(),
    address: {
      rawInput: buildRawInput(request),
      normalizedAddress: buildNormalizedAddress(request),
      lat: request.lat,
      lng: request.lng,
      confidence: request.confidence,
      source: request.mode === "suggestion" ? "suggestion" : "map_pin",
    },
    zone,
    routing,
    kitchen: {
      kitchenId: resolvedKitchenId,
      kitchenLabel: kitchenLocation?.name ?? null,
      lat: kitchenLocation?.lat ?? null,
      lng: kitchenLocation?.lng ?? null,
    },
    fulfillment: {
      source: fulfillmentSource,
    },
    pricing,
    eta,
    decision: {
      decisionState: decision.decisionState,
      decisionNote: decision.decisionNote,
      guardrailCode: decision.guardrailCode,
    },
    meta: {
      quoteMode,
      zoneProvider: config.zoneProvider,
      resolvedAt,
    },
    debug: {
      cacheHit: false,
      providerLatencyMs,
    },
  };
}

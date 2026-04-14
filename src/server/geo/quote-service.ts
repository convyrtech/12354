import type {
  DeliveryQuote,
  DeliveryQuoteRequest,
  RoutingQuote,
} from "@/lib/geo/types";
import {
  evaluateDeliveryPolicyDecision,
  getDeliveryPolicy,
} from "@/lib/delivery-policy";
import { getLocation } from "@/lib/fixtures";
import { getGeoRuntimeConfig } from "@/server/geo/config";
import { GeoValidationError } from "@/server/geo/errors";
import { quoteRoute } from "@/server/geo/routing-service";
import { findZone } from "@/server/geo/zone-service";

const PREP_MINUTES = 40;

function createRequestId() {
  const raw =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  return `quote_${raw}`;
}

function resolveBufferMinutes(zoneId: string | null) {
  return zoneId === "zone_rublevka" ? 12 : 8;
}

function buildEta(input: {
  routeMinutesLive: number | null;
  zoneId: string | null;
  deliveryState: DeliveryQuote["zone"]["deliveryState"];
}) {
  const prepMinutes = PREP_MINUTES;
  const bufferMinutes = resolveBufferMinutes(input.zoneId);

  if (input.deliveryState === "out-of-zone" || input.routeMinutesLive === null) {
    return {
      prepMinutes,
      bufferMinutes,
      etaMinMinutes: null,
      etaMaxMinutes: null,
      etaLabel: null,
    };
  }

  const etaMinMinutes = prepMinutes + bufferMinutes + input.routeMinutesLive;
  const etaSpreadMinutes = input.zoneId === "zone_rublevka" ? 20 : 15;
  const etaMaxMinutes = etaMinMinutes + etaSpreadMinutes;

  return {
    prepMinutes,
    bufferMinutes,
    etaMinMinutes,
    etaMaxMinutes,
    etaLabel: `${etaMinMinutes}-${etaMaxMinutes} мин`,
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

  const kitchenLocation = getLocation(zone.kitchenId);
  let providerLatencyMs: number | null = null;

  const routing =
    zone.kitchenId && kitchenLocation?.lat !== undefined && kitchenLocation?.lng !== undefined
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
    zoneId: zone.zoneId,
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
      kitchenId: zone.kitchenId,
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

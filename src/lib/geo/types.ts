export type GeoAddressProviderName =
  | "dadata"
  | "tomtom"
  | "2gis"
  | "fallback"
  | "manual";

export type GeoRoutingProviderName = "tomtom" | "2gis" | "fallback";

export type GeoZoneProviderName = "static" | "file";

export type GeoTrafficModel = "live" | "historical" | "none";

export type GeoAddressConfidence = "high" | "medium" | "low";

export type GeoAddressSource = "suggestion" | "map_pin" | "manual";

export type GeoDeliveryState = "in-zone" | "out-of-zone" | "cutoff";

export type GeoDecisionState = "self_serve" | "manual_confirmation";

export type GeoDeliveryFulfillmentSource = "own_courier" | "overflow_provider";

export type GeoGuardrailCode =
  | "quote_unavailable"
  | "eta_above_limit"
  | "quote_above_limit"
  | "absorb_above_limit"
  | "cutoff"
  | "vip_override"
  | "sensitive_route";

export type GeoQuoteMode = "full" | "degraded";

export type GeoApiErrorCode =
  | "invalid_request"
  | "coordinates_required_for_quote"
  | "provider_unavailable"
  | "provider_misconfigured"
  | "provider_rate_limited";

export type GeoLngLat = [lng: number, lat: number];

export type GeoPolygon = {
  type: "Polygon";
  coordinates: GeoLngLat[][];
};

export type GeoMultiPolygon = {
  type: "MultiPolygon";
  coordinates: GeoLngLat[][][];
};

export type GeoZoneGeometry = GeoPolygon | GeoMultiPolygon;

export type GeoAddressSuggestion = {
  id: string;
  title: string;
  subtitle?: string | null;
  normalizedAddress: string;
  lat: number | null;
  lng: number | null;
  provider: GeoAddressProviderName;
  confidence: GeoAddressConfidence;
  fiasId?: string | null;
  houseId?: string | null;
};

export type ZoneMatch = {
  inZone: boolean;
  deliveryState: GeoDeliveryState;
  zoneId: string | null;
  zoneLabel: string | null;
  polygon: GeoZoneGeometry | null;
  kitchenId: string | null;
  servicePointId: string | null;
  legalEntityId: string | null;
  resolverNote: string;
};

export type RoutingQuote = {
  provider: GeoRoutingProviderName;
  routeMinutesLive: number | null;
  routeDistanceMeters: number | null;
  trafficModel: GeoTrafficModel;
  quotedAt: string;
};

export type DeliveryQuote = {
  requestId: string;
  address: {
    rawInput: string;
    normalizedAddress: string;
    lat: number | null;
    lng: number | null;
    confidence: GeoAddressConfidence;
    source: GeoAddressSource;
  };
  zone: ZoneMatch;
  routing: RoutingQuote;
  kitchen: {
    kitchenId: string | null;
    kitchenLabel: string | null;
    lat: number | null;
    lng: number | null;
  };
  fulfillment: {
    source: GeoDeliveryFulfillmentSource | null;
  };
  pricing: {
    guestFeeAmount: number | null;
    liveDeliveryQuoteAmount: number | null;
    minimumOrderAmount: number | null;
  };
  eta: {
    prepMinutes: number;
    bufferMinutes: number;
    etaMinMinutes: number | null;
    etaMaxMinutes: number | null;
    etaLabel: string | null;
  };
  decision: {
    decisionState: GeoDecisionState | null;
    decisionNote: string;
    guardrailCode: GeoGuardrailCode | null;
  };
  meta: {
    quoteMode: GeoQuoteMode;
    zoneProvider: GeoZoneProviderName;
    resolvedAt: string;
  };
  debug?: {
    cacheHit: boolean;
    providerLatencyMs: number | null;
  };
};

export type GeoAddressSuggestRequest = {
  query: string;
  sessionToken?: string;
};

export type GeoAddressSuggestResponse = {
  items: GeoAddressSuggestion[];
  meta: {
    provider: GeoAddressProviderName | null;
    sessionToken?: string;
    query: string;
  };
  error?: {
    code: GeoApiErrorCode;
    message: string;
  };
};

export type GeoFindZoneRequest = {
  lat: number;
  lng: number;
};

export type GeoFindZoneResponse = ZoneMatch;

export type DeliveryQuoteFromSuggestionRequest = {
  mode: "suggestion";
  rawInput: string;
  normalizedAddress: string;
  lat: number;
  lng: number;
  confidence: GeoAddressConfidence;
  sessionToken?: string;
};

export type DeliveryQuoteFromMapPinRequest = {
  mode: "map_pin";
  lat: number;
  lng: number;
  confidence: GeoAddressConfidence;
  sourceAddressLabel: string | null;
  sessionToken?: string;
};

export type DeliveryQuoteRequest =
  | DeliveryQuoteFromSuggestionRequest
  | DeliveryQuoteFromMapPinRequest;

export type DeliveryQuoteResponse = DeliveryQuote;

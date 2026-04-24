import type {
  GeoAddressProviderName,
  GeoAddressSuggestRequest,
  GeoAddressSuggestion,
  GeoFindZoneRequest,
  GeoReverseRequest,
  GeoRoutingProviderName,
  RoutingQuote,
  ZoneMatch,
} from "@/lib/geo/types";

export type GeoProviderRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type RoutingProviderQuoteRouteInput = {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  sessionToken?: string;
};

export interface AddressProvider {
  readonly name: GeoAddressProviderName;
  suggest(
    input: GeoAddressSuggestRequest,
    options?: GeoProviderRequestOptions,
  ): Promise<GeoAddressSuggestion[]>;
}

export interface ReverseProvider {
  readonly name: GeoAddressProviderName;
  reverse(
    input: GeoReverseRequest,
    options?: GeoProviderRequestOptions,
  ): Promise<GeoAddressSuggestion | null>;
}

export interface RoutingProvider {
  readonly name: GeoRoutingProviderName;
  quoteRoute(
    input: RoutingProviderQuoteRouteInput,
    options?: GeoProviderRequestOptions,
  ): Promise<RoutingQuote>;
}

export interface ZoneProvider {
  findZone(
    input: GeoFindZoneRequest,
    options?: GeoProviderRequestOptions,
  ): Promise<ZoneMatch>;
}

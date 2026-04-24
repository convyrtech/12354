import type { RoutingQuote } from "@/lib/geo/types";
import { GeoConfigError, GeoProviderError } from "@/server/geo/errors";
import type {
  GeoProviderRequestOptions,
  RoutingProvider,
  RoutingProviderQuoteRouteInput,
} from "@/server/geo/provider-types";
import { resolveFetchSignal } from "@/server/geo/utils/fetch-signal";

const TOMTOM_BASE_URL = "https://api.tomtom.com/routing/1/calculateRoute";

type TomTomRouteSummary = {
  lengthInMeters?: number;
  travelTimeInSeconds?: number;
  liveTrafficIncidentsTravelTimeInSeconds?: number;
};

type TomTomRoute = {
  summary?: TomTomRouteSummary;
};

type TomTomCalculateRouteResponse = {
  routes?: TomTomRoute[];
};

export class TomTomRoutingProvider implements RoutingProvider {
  readonly name = "tomtom" as const;

  constructor(private readonly input: { apiKey: string | null }) {}

  async quoteRoute(
    request: RoutingProviderQuoteRouteInput,
    options?: GeoProviderRequestOptions,
  ): Promise<RoutingQuote> {
    if (!this.input.apiKey) {
      throw new GeoConfigError("TomTom API key is not configured.");
    }

    const path = `${request.originLat},${request.originLng}:${request.destinationLat},${request.destinationLng}`;
    const url = new URL(`${TOMTOM_BASE_URL}/${path}/json`);

    url.searchParams.set("key", this.input.apiKey);
    url.searchParams.set("travelMode", "car");
    url.searchParams.set("routeType", "fastest");
    url.searchParams.set("traffic", "true");
    url.searchParams.set("computeTravelTimeFor", "all");

    let response: Response;

    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: resolveFetchSignal(options),
      });
    } catch (error) {
      throw new GeoProviderError(
        error instanceof Error ? error.message : "TomTom request failed.",
        this.name,
        "provider_unavailable",
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new GeoConfigError("TomTom credentials are invalid or disabled.");
    }

    if (response.status === 429) {
      throw new GeoProviderError(
        "TomTom rate limit reached.",
        this.name,
        "provider_rate_limited",
        429,
      );
    }

    if (!response.ok) {
      throw new GeoProviderError(
        `TomTom request failed with status ${response.status}.`,
        this.name,
        "provider_unavailable",
        response.status,
      );
    }

    let payload: TomTomCalculateRouteResponse;

    try {
      payload = (await response.json()) as TomTomCalculateRouteResponse;
    } catch {
      throw new GeoProviderError(
        "TomTom returned invalid JSON.",
        this.name,
        "provider_unavailable",
        response.status,
      );
    }

    const summary = payload.routes?.[0]?.summary;
    const travelSeconds =
      summary?.travelTimeInSeconds ??
      summary?.liveTrafficIncidentsTravelTimeInSeconds ??
      null;

    if (!summary || travelSeconds === null) {
      throw new GeoProviderError(
        "TomTom did not return a usable route summary.",
        this.name,
        "provider_unavailable",
      );
    }

    return {
      provider: this.name,
      routeMinutesLive: Math.max(1, Math.round(travelSeconds / 60)),
      routeDistanceMeters: summary.lengthInMeters ?? null,
      trafficModel: "live",
      quotedAt: new Date().toISOString(),
    };
  }
}

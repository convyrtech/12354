import type { RoutingQuote } from "@/lib/geo/types";
import type {
  GeoProviderRequestOptions,
  RoutingProvider,
  RoutingProviderQuoteRouteInput,
} from "@/server/geo/provider-types";
import { getHaversineDistanceMeters } from "@/server/geo/utils/geo";

export class FallbackRoutingProvider implements RoutingProvider {
  readonly name = "fallback" as const;

  async quoteRoute(
    input: RoutingProviderQuoteRouteInput,
    _options?: GeoProviderRequestOptions,
  ): Promise<RoutingQuote> {
    const distanceMeters = getHaversineDistanceMeters({
      originLat: input.originLat,
      originLng: input.originLng,
      destinationLat: input.destinationLat,
      destinationLng: input.destinationLng,
    });
    const distanceKilometers = distanceMeters / 1000;
    const routeMinutesLive = Math.max(
      28,
      Math.round(distanceKilometers * 1.4 + 18),
    );

    return {
      provider: this.name,
      routeMinutesLive,
      routeDistanceMeters: distanceMeters,
      trafficModel: "none",
      quotedAt: new Date().toISOString(),
    };
  }
}

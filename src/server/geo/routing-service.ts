import type { RoutingQuote } from "@/lib/geo/types";
import {
  getGeoRuntimeConfig,
  hasLiveRoutingConfig,
  type GeoRuntimeConfig,
} from "@/server/geo/config";
import { GeoConfigError } from "@/server/geo/errors";
import { FallbackRoutingProvider } from "@/server/geo/providers/fallback-routing-provider";
import { TomTomRoutingProvider } from "@/server/geo/providers/tomtom-routing-provider";
import type {
  RoutingProvider,
  RoutingProviderQuoteRouteInput,
} from "@/server/geo/provider-types";

type QuoteRouteDependencies = {
  config?: GeoRuntimeConfig;
  provider?: RoutingProvider;
  signal?: AbortSignal;
};

function createRoutingProvider(config: GeoRuntimeConfig): RoutingProvider {
  if (!hasLiveRoutingConfig(config)) {
    return new FallbackRoutingProvider();
  }

  if (config.routingProvider === "tomtom") {
    return new TomTomRoutingProvider({
      apiKey: config.tomtomApiKey,
    });
  }

  if (config.routingProvider === "fallback") {
    return new FallbackRoutingProvider();
  }

  throw new GeoConfigError(
    `Routing provider "${config.routingProvider}" is not implemented.`,
  );
}

export async function quoteRoute(
  input: RoutingProviderQuoteRouteInput,
  dependencies: QuoteRouteDependencies = {},
): Promise<RoutingQuote> {
  const config = dependencies.config ?? getGeoRuntimeConfig();
  const provider = dependencies.provider ?? createRoutingProvider(config);

  return provider.quoteRoute(input, {
    signal: dependencies.signal,
    timeoutMs: 3500,
  });
}

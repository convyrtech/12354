import type {
  GeoAddressSuggestRequest,
  GeoAddressSuggestResponse,
} from "@/lib/geo/types";
import {
  getGeoRuntimeConfig,
  hasLiveSuggestConfig,
  type GeoRuntimeConfig,
} from "@/server/geo/config";
import { GeoConfigError } from "@/server/geo/errors";
import { DadataProvider } from "@/server/geo/providers/dadata-provider";
import type { AddressProvider } from "@/server/geo/provider-types";

export const MIN_SUGGEST_QUERY_LENGTH = 3;
export const MAX_SUGGEST_QUERY_LENGTH = 300;
export const MAX_SUGGEST_SESSION_TOKEN_LENGTH = 128;
const SUGGEST_PROVIDER_TIMEOUT_MS = 2500;

export type SuggestAddressesInput = GeoAddressSuggestRequest;
export type SuggestAddressesResult = GeoAddressSuggestResponse;

type SuggestAddressesDependencies = {
  config?: GeoRuntimeConfig;
  provider?: AddressProvider;
  signal?: AbortSignal;
};

function createAddressProvider(config: GeoRuntimeConfig): AddressProvider {
  if (config.suggestProvider === "dadata") {
    return new DadataProvider({
      apiKey: config.dadataApiKey,
    });
  }

  throw new GeoConfigError(
    `Suggest provider "${config.suggestProvider}" is not implemented.`,
  );
}

export function normalizeSuggestQuery(query: string) {
  return query.trim();
}

export async function suggestAddresses(
  input: SuggestAddressesInput,
  dependencies: SuggestAddressesDependencies = {},
): Promise<SuggestAddressesResult> {
  const config = dependencies.config ?? getGeoRuntimeConfig();
  const query = normalizeSuggestQuery(input.query);

  if (query.length < MIN_SUGGEST_QUERY_LENGTH) {
    return {
      items: [],
      meta: {
        provider: config.suggestProvider,
        sessionToken: input.sessionToken,
        query,
      },
    };
  }

  if (!hasLiveSuggestConfig(config)) {
    throw new GeoConfigError("Live address suggestions are not configured.");
  }

  const provider = dependencies.provider ?? createAddressProvider(config);
  const items = await provider.suggest(
    {
      query,
      sessionToken: input.sessionToken,
    },
    {
      signal: dependencies.signal,
      timeoutMs: SUGGEST_PROVIDER_TIMEOUT_MS,
    },
  );

  return {
    items,
    meta: {
      provider: provider.name,
      sessionToken: input.sessionToken,
      query,
    },
  };
}

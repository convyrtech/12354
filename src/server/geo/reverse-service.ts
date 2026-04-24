import type {
  GeoAddressSuggestion,
  GeoReverseRequest,
  GeoReverseResponse,
} from "@/lib/geo/types";
import {
  getGeoRuntimeConfig,
  hasLiveSuggestConfig,
  type GeoRuntimeConfig,
} from "@/server/geo/config";
import { GeoConfigError, GeoValidationError } from "@/server/geo/errors";
import { DadataProvider } from "@/server/geo/providers/dadata-provider";
import type { ReverseProvider } from "@/server/geo/provider-types";

const REVERSE_PROVIDER_TIMEOUT_MS = 2500;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 256;
const COORD_PRECISION = 5; // ~1.1 m at Moscow latitude

type ReverseAddressDependencies = {
  config?: GeoRuntimeConfig;
  provider?: ReverseProvider;
  signal?: AbortSignal;
  now?: () => number;
};

type CacheEntry = {
  result: GeoAddressSuggestion | null;
  expiresAt: number;
};

// Module-level Map = per-instance cache. On Vercel Fluid Compute warm instances
// this captures the typical "drag pin around the same building" pattern.
// Cold start = empty cache; that's fine for this traffic profile.
const reverseCache = new Map<string, CacheEntry>();

function buildCacheKey(lat: number, lng: number): string {
  const roundedLat = lat.toFixed(COORD_PRECISION);
  const roundedLng = lng.toFixed(COORD_PRECISION);
  return `${roundedLat},${roundedLng}`;
}

function readFromCache(key: string, now: number): CacheEntry | null {
  const entry = reverseCache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt < now) {
    reverseCache.delete(key);
    return null;
  }
  // Refresh recency: delete + re-set moves the entry to the tail of insertion
  // order so eviction reaches for genuinely-stale entries first (true LRU
  // instead of FIFO).
  reverseCache.delete(key);
  reverseCache.set(key, entry);
  return entry;
}

function writeToCache(
  key: string,
  result: GeoAddressSuggestion | null,
  now: number,
): void {
  if (reverseCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = reverseCache.keys().next().value;
    if (oldest !== undefined) {
      reverseCache.delete(oldest);
    }
  }
  reverseCache.set(key, {
    result,
    expiresAt: now + CACHE_TTL_MS,
  });
}

function createReverseProvider(config: GeoRuntimeConfig): ReverseProvider {
  if (config.suggestProvider === "dadata") {
    return new DadataProvider({
      apiKey: config.dadataApiKey,
    });
  }

  throw new GeoConfigError(
    `Reverse provider for "${config.suggestProvider}" is not implemented.`,
  );
}

export async function reverseAddress(
  input: GeoReverseRequest,
  dependencies: ReverseAddressDependencies = {},
): Promise<GeoReverseResponse> {
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new GeoValidationError("Coordinates are required for reverse geocoding.");
  }

  const config = dependencies.config ?? getGeoRuntimeConfig();
  const now = dependencies.now ? dependencies.now() : Date.now();
  const resolvedAt = new Date(now).toISOString();
  const cacheKey = buildCacheKey(input.lat, input.lng);

  const cached = readFromCache(cacheKey, now);
  if (cached) {
    return {
      address: cached.result,
      meta: {
        provider: config.suggestProvider,
        cacheHit: true,
        resolvedAt,
      },
    };
  }

  if (!hasLiveSuggestConfig(config)) {
    throw new GeoConfigError("Live address reverse-geocoding is not configured.");
  }

  const provider = dependencies.provider ?? createReverseProvider(config);
  const result = await provider.reverse(
    {
      lat: input.lat,
      lng: input.lng,
      sessionToken: input.sessionToken,
    },
    {
      signal: dependencies.signal,
      timeoutMs: REVERSE_PROVIDER_TIMEOUT_MS,
    },
  );

  writeToCache(cacheKey, result, now);

  return {
    address: result,
    meta: {
      provider: provider.name,
      cacheHit: false,
      resolvedAt,
    },
  };
}

// Test-only: clear the in-process cache between vitest runs.
export function __clearReverseCacheForTest() {
  reverseCache.clear();
}

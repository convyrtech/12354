import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoutingQuote } from "@/lib/geo/types";
import type { GeoRuntimeConfig } from "@/server/geo/config";
import type {
  GeoProviderRequestOptions,
  RoutingProvider,
  RoutingProviderQuoteRouteInput,
} from "@/server/geo/provider-types";
import { quoteRoute } from "@/server/geo/routing-service";

const BASE_CONFIG: GeoRuntimeConfig = {
  suggestProvider: "dadata",
  routingProvider: "tomtom",
  zoneProvider: "static",
  enableLiveSuggest: true,
  enableLiveQuote: true,
  enableLiveMap: true,
  enablePaidProvider: true,
  dadataApiKey: "test-dadata",
  tomtomApiKey: "test-tomtom",
  twoGisApiKey: null,
  zoneFile: null,
};

const INPUT: RoutingProviderQuoteRouteInput = {
  originLat: 55.6584,
  originLng: 37.2318,
  destinationLat: 55.7611,
  destinationLng: 37.6094,
};

function makeProvider(
  impl: (
    request: RoutingProviderQuoteRouteInput,
    options?: GeoProviderRequestOptions,
  ) => Promise<RoutingQuote>,
  name: RoutingProvider["name"] = "tomtom",
): RoutingProvider {
  return { name, quoteRoute: impl };
}

describe("quoteRoute", () => {
  // Fresh spy per test — restoreAllMocks in afterEach would otherwise detach
  // the console.warn stub before the next test's mockClear, making the third
  // test see an undefined spy.
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns the live provider quote on success (happy path)", async () => {
    const liveQuote: RoutingQuote = {
      provider: "tomtom",
      routeMinutesLive: 25,
      routeDistanceMeters: 15000,
      trafficModel: "live",
      quotedAt: "2026-04-23T09:00:00Z",
    };
    const provider = makeProvider(async () => liveQuote);

    const result = await quoteRoute(INPUT, {
      config: BASE_CONFIG,
      provider,
    });

    expect(result).toBe(liveQuote);
    expect(result.provider).toBe("tomtom");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("falls back to Haversine when the live provider throws a non-abort error", async () => {
    const provider = makeProvider(async () => {
      throw new Error("TomTom 503 Service Unavailable");
    });

    const result = await quoteRoute(INPUT, {
      config: BASE_CONFIG,
      provider,
    });

    expect(result.provider).toBe("fallback");
    expect(result.routeMinutesLive).toBeGreaterThan(0);
    expect(result.trafficModel).toBe("none");
    // Ops signal: fallback should be logged so provider flaps are visible.
    expect(warnSpy).toHaveBeenCalledOnce();
    const payload = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(payload.event).toBe("routing_provider_degraded");
    expect(payload.provider).toBe("tomtom");
    expect(payload.reason).toContain("TomTom 503");
  });

  it("propagates AbortError instead of degrading (cancellation is not a failure)", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const provider = makeProvider(async () => {
      throw abortError;
    });

    await expect(
      quoteRoute(INPUT, { config: BASE_CONFIG, provider }),
    ).rejects.toThrow("aborted");
    // And no degrade log — cancellations shouldn't trigger ops alerts.
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("forwards the abort signal and timeout to the provider", async () => {
    const providerCall = vi.fn<
      (
        request: RoutingProviderQuoteRouteInput,
        options?: GeoProviderRequestOptions,
      ) => Promise<RoutingQuote>
    >(async () => ({
      provider: "tomtom",
      routeMinutesLive: 10,
      routeDistanceMeters: 5000,
      trafficModel: "live",
      quotedAt: "2026-04-23T09:00:00Z",
    }));
    const provider = makeProvider(providerCall);
    const signal = new AbortController().signal;

    await quoteRoute(INPUT, { config: BASE_CONFIG, provider, signal });

    expect(providerCall).toHaveBeenCalledWith(INPUT, {
      signal,
      timeoutMs: 3500,
    });
  });

  it("handles non-Error rejection values too (string/unknown thrown)", async () => {
    const provider = makeProvider(async () => {
      throw "network died" as unknown as Error;
    });

    const result = await quoteRoute(INPUT, {
      config: BASE_CONFIG,
      provider,
    });

    expect(result.provider).toBe("fallback");
    const payload = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(payload.reason).toBe("network died");
  });
});

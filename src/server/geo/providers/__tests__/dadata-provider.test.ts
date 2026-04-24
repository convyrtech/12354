import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeoConfigError, GeoProviderError } from "@/server/geo/errors";
import { DadataProvider } from "@/server/geo/providers/dadata-provider";

type FetchResponseInit = {
  status?: number;
  bodyJson?: unknown;
  bodyText?: string;
  throws?: Error;
};

function mockFetchOnce(init: FetchResponseInit) {
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockImplementationOnce(async () => {
      if (init.throws) throw init.throws;
      const status = init.status ?? 200;
      return new Response(
        init.bodyText ??
          (init.bodyJson !== undefined ? JSON.stringify(init.bodyJson) : ""),
        { status },
      );
    });
  return fetchSpy;
}

function makeDaDataSuggestion(overrides: Record<string, unknown> = {}) {
  return {
    value: "Тверская улица, 7",
    unrestricted_value: "г Москва, ул Тверская, д 7",
    data: {
      fias_id: "abc-123",
      geo_lat: "55.7611",
      geo_lon: "37.6094",
      city_with_type: "г Москва",
      region_with_type: "г Москва",
      ...overrides,
    },
  };
}

describe("DadataProvider.suggest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps DaData suggestion items to GeoAddressSuggestion", async () => {
    mockFetchOnce({
      bodyJson: { suggestions: [makeDaDataSuggestion()] },
    });
    const provider = new DadataProvider({ apiKey: "test-key" });

    const items = await provider.suggest({ query: "Тверская 7" });

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Тверская улица, 7");
    expect(items[0].normalizedAddress).toBe("г Москва, ул Тверская, д 7");
    expect(items[0].lat).toBeCloseTo(55.7611);
    expect(items[0].lng).toBeCloseTo(37.6094);
    expect(items[0].provider).toBe("dadata");
    expect(items[0].confidence).toBe("high");
    expect(items[0].fiasId).toBe("abc-123");
  });

  it("returns empty array when DaData returns no suggestions", async () => {
    mockFetchOnce({ bodyJson: { suggestions: [] } });
    const provider = new DadataProvider({ apiKey: "test-key" });

    const items = await provider.suggest({ query: "asdfjkl" });
    expect(items).toEqual([]);
  });

  it("downgrades confidence to 'medium' when fiasId exists but coords are missing", async () => {
    mockFetchOnce({
      bodyJson: {
        suggestions: [
          makeDaDataSuggestion({ geo_lat: null, geo_lon: null }),
        ],
      },
    });
    const provider = new DadataProvider({ apiKey: "test-key" });

    const items = await provider.suggest({ query: "Тверская" });
    expect(items[0].confidence).toBe("medium");
    expect(items[0].lat).toBeNull();
  });

  it("throws GeoConfigError when the API key is missing", async () => {
    const provider = new DadataProvider({ apiKey: null });
    await expect(provider.suggest({ query: "x" })).rejects.toBeInstanceOf(
      GeoConfigError,
    );
  });

  it("throws GeoConfigError on 401 (invalid credentials)", async () => {
    mockFetchOnce({ status: 401, bodyJson: {} });
    const provider = new DadataProvider({ apiKey: "bad-key" });

    await expect(provider.suggest({ query: "x" })).rejects.toBeInstanceOf(
      GeoConfigError,
    );
  });

  it("throws GeoProviderError provider_rate_limited on 429", async () => {
    mockFetchOnce({ status: 429, bodyJson: {} });
    const provider = new DadataProvider({ apiKey: "test-key" });

    await expect(provider.suggest({ query: "x" })).rejects.toMatchObject({
      name: "GeoProviderError",
      code: "provider_rate_limited",
      statusCode: 429,
    });
  });

  it("throws GeoProviderError provider_unavailable on 503", async () => {
    mockFetchOnce({ status: 503, bodyJson: {} });
    const provider = new DadataProvider({ apiKey: "test-key" });

    await expect(provider.suggest({ query: "x" })).rejects.toMatchObject({
      name: "GeoProviderError",
      code: "provider_unavailable",
      statusCode: 503,
    });
  });

  it("throws GeoProviderError provider_unavailable on invalid JSON body", async () => {
    mockFetchOnce({ status: 200, bodyText: "not json" });
    const provider = new DadataProvider({ apiKey: "test-key" });

    await expect(provider.suggest({ query: "x" })).rejects.toMatchObject({
      name: "GeoProviderError",
      code: "provider_unavailable",
    });
  });

  it("propagates AbortError without wrapping it as provider_unavailable", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mockFetchOnce({ throws: abortError });
    const provider = new DadataProvider({ apiKey: "test-key" });

    await expect(
      provider.suggest({ query: "x" }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("wraps generic fetch errors (timeout, network) as provider_unavailable", async () => {
    mockFetchOnce({ throws: new Error("ECONNRESET") });
    const provider = new DadataProvider({ apiKey: "test-key" });

    await expect(provider.suggest({ query: "x" })).rejects.toMatchObject({
      name: "GeoProviderError",
      code: "provider_unavailable",
    });
  });
});

describe("DadataProvider.reverse", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the first suggestion as a GeoAddressSuggestion", async () => {
    mockFetchOnce({
      bodyJson: { suggestions: [makeDaDataSuggestion()] },
    });
    const provider = new DadataProvider({ apiKey: "test-key" });

    const result = await provider.reverse({
      lat: 55.7611,
      lng: 37.6094,
    });

    expect(result).not.toBeNull();
    expect(result?.normalizedAddress).toBe("г Москва, ул Тверская, д 7");
    expect(result?.provider).toBe("dadata");
    expect(result?.confidence).toBe("high");
  });

  it("returns null when DaData finds nothing at the coordinate", async () => {
    mockFetchOnce({ bodyJson: { suggestions: [] } });
    const provider = new DadataProvider({ apiKey: "test-key" });

    const result = await provider.reverse({ lat: 0, lng: 0 });
    expect(result).toBeNull();
  });

  it("shares the same error mapping as suggest — 429 → provider_rate_limited", async () => {
    mockFetchOnce({ status: 429, bodyJson: {} });
    const provider = new DadataProvider({ apiKey: "test-key" });

    await expect(
      provider.reverse({ lat: 55.76, lng: 37.61 }),
    ).rejects.toMatchObject({
      name: "GeoProviderError",
      code: "provider_rate_limited",
    });
  });

  it("shares the same error mapping as suggest — 401 → GeoConfigError", async () => {
    mockFetchOnce({ status: 401, bodyJson: {} });
    const provider = new DadataProvider({ apiKey: "bad-key" });

    await expect(
      provider.reverse({ lat: 55.76, lng: 37.61 }),
    ).rejects.toBeInstanceOf(GeoConfigError);
  });

  it("sends lat/lng and reverse-specific params in the request body", async () => {
    const fetchSpy = mockFetchOnce({
      bodyJson: { suggestions: [] },
    });
    const provider = new DadataProvider({ apiKey: "test-key" });

    await provider.reverse({ lat: 55.7611, lng: 37.6094 });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const call = fetchSpy.mock.calls[0];
    const body = JSON.parse(call[1]?.body as string);
    expect(body.lat).toBe(55.7611);
    expect(body.lon).toBe(37.6094);
    expect(body.radius_meters).toBeGreaterThan(0);
    expect(body.count).toBe(1);
    // And the URL targets /geolocate/address, not /suggest/address
    const url = call[0] as string;
    expect(url).toContain("/geolocate/address");
  });
});

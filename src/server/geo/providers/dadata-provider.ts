import type {
  GeoAddressSuggestion,
  GeoAddressSuggestRequest,
  GeoReverseRequest,
} from "@/lib/geo/types";
import { GeoConfigError, GeoProviderError } from "@/server/geo/errors";
import type {
  AddressProvider,
  GeoProviderRequestOptions,
  ReverseProvider,
} from "@/server/geo/provider-types";
import { resolveFetchSignal } from "@/server/geo/utils/fetch-signal";

const DADATA_BASE = "https://suggestions.dadata.ru/suggestions/api/4_1/rs";
const SUGGEST_PATH = "/suggest/address";
const GEOLOCATE_PATH = "/geolocate/address";
const DEFAULT_RESULT_COUNT = 8;
const REVERSE_RADIUS_METERS = 100;
const REVERSE_RESULT_COUNT = 1;

type DadataAddressData = {
  fias_id?: string | null;
  house_fias_id?: string | null;
  house_kladr_id?: string | null;
  geo_lat?: string | null;
  geo_lon?: string | null;
  city_with_type?: string | null;
  city_district_with_type?: string | null;
  settlement_with_type?: string | null;
  region_with_type?: string | null;
  flat?: string | null;
  house?: string | null;
};

type DadataSuggestion = {
  value?: string | null;
  unrestricted_value?: string | null;
  data?: DadataAddressData | null;
};

type DadataResponse = {
  suggestions?: DadataSuggestion[];
};

function parseCoordinate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSubtitle(item: DadataSuggestion) {
  const values = [
    item.data?.city_district_with_type,
    item.data?.city_with_type,
    item.data?.settlement_with_type,
    item.data?.region_with_type,
  ].filter((value): value is string => Boolean(value));

  const uniqueValues = Array.from(new Set(values));
  return uniqueValues.length > 0 ? uniqueValues.slice(0, 2).join(" • ") : null;
}

function buildSuggestionId(item: DadataSuggestion) {
  const fiasId = item.data?.fias_id?.trim();

  if (fiasId) {
    return `dadata:${fiasId}`;
  }

  const unrestrictedValue =
    item.unrestricted_value?.trim() || item.value?.trim() || "unknown";
  const encoded = Buffer.from(unrestrictedValue, "utf8").toString("base64url");

  return `dadata:${encoded}`;
}

function resolveConfidence(item: DadataSuggestion) {
  const hasFiasId = Boolean(item.data?.fias_id);
  const lat = parseCoordinate(item.data?.geo_lat);
  const lng = parseCoordinate(item.data?.geo_lon);

  if (hasFiasId && lat !== null && lng !== null) {
    return "high" as const;
  }

  if (hasFiasId) {
    return "medium" as const;
  }

  return "low" as const;
}

function mapSuggestion(item: DadataSuggestion): GeoAddressSuggestion {
  const normalizedAddress =
    item.unrestricted_value?.trim() || item.value?.trim() || "";

  return {
    id: buildSuggestionId(item),
    title: item.value?.trim() || normalizedAddress,
    subtitle: buildSubtitle(item),
    normalizedAddress,
    lat: parseCoordinate(item.data?.geo_lat),
    lng: parseCoordinate(item.data?.geo_lon),
    provider: "dadata",
    confidence: resolveConfidence(item),
    fiasId: item.data?.fias_id?.trim() || null,
    houseId:
      item.data?.house_fias_id?.trim() ||
      item.data?.house_kladr_id?.trim() ||
      null,
  };
}

export class DadataProvider implements AddressProvider, ReverseProvider {
  readonly name = "dadata" as const;

  constructor(
    private readonly input: {
      apiKey: string | null;
      baseUrl?: string;
      resultCount?: number;
    },
  ) {}

  // Single private call site for both suggest and reverse — owns auth, timeout,
  // error mapping. Adding another DaData endpoint = one new public method.
  private async callDadata(
    path: string,
    body: Record<string, unknown>,
    options?: GeoProviderRequestOptions,
  ): Promise<DadataResponse> {
    if (!this.input.apiKey) {
      throw new GeoConfigError("DaData API key is not configured.");
    }

    const url = `${this.input.baseUrl ?? DADATA_BASE}${path}`;

    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Token ${this.input.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: resolveFetchSignal(options),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      throw new GeoProviderError(
        error instanceof Error ? error.message : "DaData request failed.",
        this.name,
        "provider_unavailable",
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new GeoConfigError("DaData credentials are invalid or disabled.");
    }

    if (response.status === 429) {
      throw new GeoProviderError(
        "DaData rate limit reached.",
        this.name,
        "provider_rate_limited",
        429,
      );
    }

    if (!response.ok) {
      throw new GeoProviderError(
        `DaData request failed with status ${response.status}.`,
        this.name,
        "provider_unavailable",
        response.status,
      );
    }

    try {
      return (await response.json()) as DadataResponse;
    } catch {
      throw new GeoProviderError(
        "DaData returned invalid JSON.",
        this.name,
        "provider_unavailable",
        response.status,
      );
    }
  }

  async suggest(
    request: GeoAddressSuggestRequest,
    options?: GeoProviderRequestOptions,
  ): Promise<GeoAddressSuggestion[]> {
    const payload = await this.callDadata(
      SUGGEST_PATH,
      {
        query: request.query,
        count: this.input.resultCount ?? DEFAULT_RESULT_COUNT,
      },
      options,
    );

    return Array.isArray(payload.suggestions)
      ? payload.suggestions.map(mapSuggestion)
      : [];
  }

  async reverse(
    request: GeoReverseRequest,
    options?: GeoProviderRequestOptions,
  ): Promise<GeoAddressSuggestion | null> {
    const payload = await this.callDadata(
      GEOLOCATE_PATH,
      {
        lat: request.lat,
        lon: request.lng,
        count: REVERSE_RESULT_COUNT,
        radius_meters: REVERSE_RADIUS_METERS,
      },
      options,
    );

    const first = payload.suggestions?.[0];
    if (!first) {
      return null;
    }

    return mapSuggestion(first);
  }
}

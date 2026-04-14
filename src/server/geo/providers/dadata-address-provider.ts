import type {
  GeoAddressSuggestion,
  GeoAddressSuggestRequest,
} from "@/lib/geo/types";
import { GeoConfigError, GeoProviderError } from "@/server/geo/errors";
import type {
  AddressProvider,
  GeoProviderRequestOptions,
} from "@/server/geo/provider-types";

const DADATA_SUGGEST_ENDPOINT =
  "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address";
const DEFAULT_TIMEOUT_MS = 2500;
const DEFAULT_RESULT_COUNT = 8;

type DadataAddressSuggestionItem = {
  value?: string | null;
  unrestricted_value?: string | null;
  data?: {
    fias_id?: string | null;
    house_fias_id?: string | null;
    house_kladr_id?: string | null;
    geo_lat?: string | null;
    geo_lon?: string | null;
    city_with_type?: string | null;
    city_district_with_type?: string | null;
    settlement_with_type?: string | null;
    region_with_type?: string | null;
  } | null;
};

type DadataSuggestResponse = {
  suggestions?: DadataAddressSuggestionItem[];
};

function resolveFetchSignal(options?: GeoProviderRequestOptions) {
  const signals: AbortSignal[] = [];

  if (options?.signal) {
    signals.push(options.signal);
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (
    timeoutMs > 0 &&
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    signals.push(AbortSignal.timeout(timeoutMs));
  }

  if (signals.length === 0) {
    return undefined;
  }

  if (signals.length === 1) {
    return signals[0];
  }

  return AbortSignal.any(signals);
}

function parseCoordinate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSubtitle(item: DadataAddressSuggestionItem) {
  const values = [
    item.data?.city_district_with_type,
    item.data?.city_with_type,
    item.data?.settlement_with_type,
    item.data?.region_with_type,
  ].filter((value): value is string => Boolean(value));

  const uniqueValues = Array.from(new Set(values));
  return uniqueValues.length > 0 ? uniqueValues.slice(0, 2).join(" • ") : null;
}

function buildSuggestionId(item: DadataAddressSuggestionItem) {
  const fiasId = item.data?.fias_id?.trim();

  if (fiasId) {
    return `dadata:${fiasId}`;
  }

  const unrestrictedValue = item.unrestricted_value?.trim() || item.value?.trim() || "unknown";
  const encoded = Buffer.from(unrestrictedValue, "utf8").toString("base64url");

  return `dadata:${encoded}`;
}

function resolveConfidence(item: DadataAddressSuggestionItem) {
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

function mapSuggestion(item: DadataAddressSuggestionItem): GeoAddressSuggestion {
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

export class DadataAddressProvider implements AddressProvider {
  readonly name = "dadata" as const;

  constructor(
    private readonly input: {
      apiKey: string | null;
      endpoint?: string;
      resultCount?: number;
    },
  ) {}

  async suggest(
    request: GeoAddressSuggestRequest,
    options?: GeoProviderRequestOptions,
  ): Promise<GeoAddressSuggestion[]> {
    if (!this.input.apiKey) {
      throw new GeoConfigError("DaData API key is not configured.");
    }

    let response: Response;

    try {
      response = await fetch(this.input.endpoint ?? DADATA_SUGGEST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Token ${this.input.apiKey}`,
        },
        body: JSON.stringify({
          query: request.query,
          count: this.input.resultCount ?? DEFAULT_RESULT_COUNT,
        }),
        signal: resolveFetchSignal(options),
      });
    } catch (error) {
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

    let payload: DadataSuggestResponse;

    try {
      payload = (await response.json()) as DadataSuggestResponse;
    } catch {
      throw new GeoProviderError(
        "DaData returned invalid JSON.",
        this.name,
        "provider_unavailable",
        response.status,
      );
    }

    return Array.isArray(payload.suggestions)
      ? payload.suggestions.map(mapSuggestion)
      : [];
  }
}

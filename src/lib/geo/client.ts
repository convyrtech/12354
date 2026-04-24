import type {
  GeoApiErrorCode,
  GeoAddressSuggestRequest,
  GeoAddressSuggestResponse,
  GeoReverseRequest,
  GeoReverseResponse,
  DeliveryQuoteRequest,
  DeliveryQuoteResponse,
} from "./types";

export class DeliverySuggestClientError extends Error {
  constructor(
    message: string,
    public readonly code: GeoApiErrorCode,
    public readonly status: number,
  ) {
    super(message);
    this.name = "DeliverySuggestClientError";
  }
}

// Tiny LRU for the typing session: same query within a session = one fetch.
// Cleared by full reload; not persisted. Skipped entirely on AbortError so
// cancelled responses don't poison the cache.
const SUGGEST_CACHE_MAX = 30;
const suggestCache = new Map<string, GeoAddressSuggestResponse>();

function suggestCacheKey(input: GeoAddressSuggestRequest): string {
  return input.query.trim().toLowerCase();
}

export function __clearSuggestCacheForTest() {
  suggestCache.clear();
}

export async function fetchDeliveryAddressSuggestions(
  input: GeoAddressSuggestRequest,
  options?: { signal?: AbortSignal },
): Promise<GeoAddressSuggestResponse> {
  const cacheKey = suggestCacheKey(input);
  const cached = cacheKey ? suggestCache.get(cacheKey) : undefined;
  if (cached) {
    // Refresh recency on hit so repeatedly-used queries stay warm (LRU, not FIFO).
    suggestCache.delete(cacheKey);
    suggestCache.set(cacheKey, cached);
    return cached;
  }

  let response: Response;

  try {
    response = await fetch("/api/delivery/suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
      signal: options?.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new DeliverySuggestClientError(
      "Address suggestions are temporarily unavailable.",
      "provider_unavailable",
      0,
    );
  }

  let payload: GeoAddressSuggestResponse | null = null;

  try {
    payload = (await response.json()) as GeoAddressSuggestResponse;
  } catch {
    if (!response.ok) {
      throw new DeliverySuggestClientError(
        "Address suggestions are temporarily unavailable.",
        "provider_unavailable",
        response.status,
      );
    }

    throw new DeliverySuggestClientError(
      "Address suggestions response is invalid.",
      "provider_unavailable",
      response.status,
    );
  }

  if (!response.ok) {
    throw new DeliverySuggestClientError(
      payload.error?.message ?? "Address suggestions are temporarily unavailable.",
      payload.error?.code ?? "provider_unavailable",
      response.status,
    );
  }

  if (cacheKey) {
    if (suggestCache.size >= SUGGEST_CACHE_MAX) {
      const oldest = suggestCache.keys().next().value;
      if (oldest !== undefined) {
        suggestCache.delete(oldest);
      }
    }
    suggestCache.set(cacheKey, payload);
  }

  return payload;
}

export class DeliveryReverseClientError extends Error {
  constructor(
    message: string,
    public readonly code: GeoApiErrorCode,
    public readonly status: number,
    public readonly retriable: boolean,
  ) {
    super(message);
    this.name = "DeliveryReverseClientError";
  }
}

export async function fetchDeliveryReverse(
  input: GeoReverseRequest,
  options?: { signal?: AbortSignal },
): Promise<GeoReverseResponse> {
  let response: Response;

  try {
    response = await fetch("/api/delivery/reverse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
      signal: options?.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new DeliveryReverseClientError(
      "Reverse geocoding is temporarily unavailable.",
      "provider_unavailable",
      0,
      true,
    );
  }

  let payload: GeoReverseResponse | null = null;

  try {
    payload = (await response.json()) as GeoReverseResponse;
  } catch {
    throw new DeliveryReverseClientError(
      "Reverse geocoding response is invalid.",
      "provider_unavailable",
      response.status,
      true,
    );
  }

  if (!response.ok) {
    throw new DeliveryReverseClientError(
      payload.error?.message ?? "Reverse geocoding is temporarily unavailable.",
      payload.error?.code ?? "provider_unavailable",
      response.status,
      payload.error?.retriable ?? true,
    );
  }

  return payload;
}

export class DeliveryQuoteClientError extends Error {
  constructor(
    message: string,
    public readonly code: GeoApiErrorCode,
    public readonly status: number,
  ) {
    super(message);
    this.name = "DeliveryQuoteClientError";
  }
}

export async function fetchDeliveryQuote(
  input: DeliveryQuoteRequest,
  options?: { signal?: AbortSignal },
): Promise<DeliveryQuoteResponse> {
  let response: Response;

  try {
    response = await fetch("/api/delivery/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
      signal: options?.signal,
    });
  } catch {
    throw new DeliveryQuoteClientError(
      "Delivery quote is temporarily unavailable.",
      "provider_unavailable",
      0,
    );
  }

  let payload: (DeliveryQuoteResponse & {
    error?: { code?: GeoApiErrorCode; message?: string };
  }) | null = null;

  try {
    payload = (await response.json()) as DeliveryQuoteResponse & {
      error?: { code?: GeoApiErrorCode; message?: string };
    };
  } catch {
    if (!response.ok) {
      throw new DeliveryQuoteClientError(
        "Delivery quote is temporarily unavailable.",
        "provider_unavailable",
        response.status,
      );
    }

    throw new DeliveryQuoteClientError(
      "Delivery quote response is invalid.",
      "provider_unavailable",
      response.status,
    );
  }

  if (!response.ok) {
    throw new DeliveryQuoteClientError(
      payload.error?.message ?? "Delivery quote is temporarily unavailable.",
      payload.error?.code ?? "provider_unavailable",
      response.status,
    );
  }

  return payload;
}

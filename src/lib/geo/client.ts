import type {
  GeoApiErrorCode,
  GeoAddressSuggestRequest,
  GeoAddressSuggestResponse,
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

export async function fetchDeliveryAddressSuggestions(
  input: GeoAddressSuggestRequest,
  options?: { signal?: AbortSignal },
): Promise<GeoAddressSuggestResponse> {
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
  } catch {
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

import type { GeoApiErrorCode } from "@/lib/geo/types";

export class GeoValidationError extends Error {
  readonly code = "invalid_request" as const;

  constructor(message: string) {
    super(message);
    this.name = "GeoValidationError";
  }
}

export class GeoConfigError extends Error {
  readonly code = "provider_misconfigured" as const;

  constructor(message: string) {
    super(message);
    this.name = "GeoConfigError";
  }
}

export class GeoProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code: Extract<
      GeoApiErrorCode,
      "provider_unavailable" | "provider_rate_limited"
    > = "provider_unavailable",
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "GeoProviderError";
  }
}

import { NextResponse } from "next/server";
import type {
  GeoApiError,
  GeoApiErrorCode,
  GeoReverseResponse,
} from "@/lib/geo/types";
import { getGeoRuntimeConfig } from "@/server/geo/config";
import {
  GeoConfigError,
  GeoProviderError,
  GeoValidationError,
} from "@/server/geo/errors";
import { reverseAddress } from "@/server/geo/reverse-service";

export const runtime = "nodejs";

const MAX_SESSION_TOKEN_LENGTH = 128;
const COORD_MIN_LAT = -90;
const COORD_MAX_LAT = 90;
const COORD_MIN_LNG = -180;
const COORD_MAX_LNG = 180;

type ReverseRequestBody = {
  lat: number;
  lng: number;
  sessionToken?: string;
};

const RETRIABLE_ERROR_CODES = new Set<GeoApiErrorCode>([
  "provider_unavailable",
]);

function buildResponse(body: GeoReverseResponse, init?: { status?: number }) {
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

function buildError(
  code: GeoApiErrorCode,
  message: string,
): GeoApiError {
  return {
    code,
    message,
    retriable: RETRIABLE_ERROR_CODES.has(code),
  };
}

function invalidRequestResponse(message: string) {
  return buildResponse(
    {
      address: null,
      meta: {
        provider: null,
        cacheHit: false,
        resolvedAt: new Date().toISOString(),
      },
      error: buildError("invalid_request", message),
    },
    { status: 400 },
  );
}

function providerFailureResponse(
  errorCode: Extract<
    GeoApiErrorCode,
    "provider_unavailable" | "provider_misconfigured" | "provider_rate_limited"
  >,
  provider: GeoReverseResponse["meta"]["provider"],
) {
  return buildResponse(
    {
      address: null,
      meta: {
        provider,
        cacheHit: false,
        resolvedAt: new Date().toISOString(),
      },
      error: buildError(
        errorCode,
        "Reverse geocoding is temporarily unavailable.",
      ),
    },
    { status: 503 },
  );
}

async function parseBody(request: Request): Promise<ReverseRequestBody> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new GeoValidationError("Request body must be valid JSON.");
  }

  if (!payload || typeof payload !== "object") {
    throw new GeoValidationError("Request body must be an object.");
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.lat !== "number" || !Number.isFinite(record.lat)) {
    throw new GeoValidationError("lat must be a finite number.");
  }
  if (record.lat < COORD_MIN_LAT || record.lat > COORD_MAX_LAT) {
    throw new GeoValidationError("lat must be within [-90, 90].");
  }

  if (typeof record.lng !== "number" || !Number.isFinite(record.lng)) {
    throw new GeoValidationError("lng must be a finite number.");
  }
  if (record.lng < COORD_MIN_LNG || record.lng > COORD_MAX_LNG) {
    throw new GeoValidationError("lng must be within [-180, 180].");
  }

  if (
    record.sessionToken !== undefined &&
    typeof record.sessionToken !== "string"
  ) {
    throw new GeoValidationError("Session token must be a string.");
  }

  if (
    typeof record.sessionToken === "string" &&
    record.sessionToken.length > MAX_SESSION_TOKEN_LENGTH
  ) {
    throw new GeoValidationError(
      `Session token must not exceed ${MAX_SESSION_TOKEN_LENGTH} characters.`,
    );
  }

  return {
    lat: record.lat,
    lng: record.lng,
    sessionToken:
      typeof record.sessionToken === "string" && record.sessionToken.trim()
        ? record.sessionToken.trim()
        : undefined,
  };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const config = getGeoRuntimeConfig();

  try {
    const body = await parseBody(request);
    const result = await reverseAddress(body, {
      config,
      signal: request.signal,
    });
    const latencyMs = Date.now() - startedAt;

    console.info(
      JSON.stringify({
        event: "delivery_reverse_success",
        provider: result.meta.provider,
        cacheHit: result.meta.cacheHit,
        sessionTokenPresent: Boolean(body.sessionToken),
        addressFound: result.address !== null,
        latencyMs,
      }),
    );

    return buildResponse(result);
  } catch (error) {
    const latencyMs = Date.now() - startedAt;

    if (error instanceof Error && error.name === "AbortError") {
      // Client cancelled — no response will be consumed; return early.
      return new NextResponse(null, { status: 499 });
    }

    if (error instanceof GeoValidationError) {
      return invalidRequestResponse(error.message);
    }

    if (error instanceof GeoConfigError) {
      console.warn(
        JSON.stringify({
          event: "delivery_reverse_provider_error",
          provider: config.suggestProvider,
          latencyMs,
          reason: error.code,
        }),
      );

      return providerFailureResponse(error.code, config.suggestProvider);
    }

    if (error instanceof GeoProviderError) {
      console.warn(
        JSON.stringify({
          event: "delivery_reverse_provider_error",
          provider: error.provider,
          latencyMs,
          upstreamStatusCode: error.statusCode ?? null,
          reason: error.code,
        }),
      );

      return providerFailureResponse(
        error.code,
        error.provider === "dadata" ||
          error.provider === "tomtom" ||
          error.provider === "2gis" ||
          error.provider === "fallback" ||
          error.provider === "manual"
          ? error.provider
          : null,
      );
    }

    console.error(
      JSON.stringify({
        event: "delivery_reverse_unknown_error",
        provider: config.suggestProvider,
        latencyMs,
      }),
    );

    return providerFailureResponse("provider_unavailable", config.suggestProvider);
  }
}

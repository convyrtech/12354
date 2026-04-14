import { NextResponse } from "next/server";
import type {
  GeoAddressSuggestResponse,
  GeoApiErrorCode,
} from "@/lib/geo/types";
import {
  MAX_SUGGEST_QUERY_LENGTH,
  MAX_SUGGEST_SESSION_TOKEN_LENGTH,
  suggestAddresses,
} from "@/server/geo/address-service";
import { getGeoRuntimeConfig } from "@/server/geo/config";
import {
  GeoConfigError,
  GeoProviderError,
  GeoValidationError,
} from "@/server/geo/errors";

export const runtime = "nodejs";

type SuggestRequestBody = {
  query: string;
  sessionToken?: string;
};

function buildResponse(
  body: GeoAddressSuggestResponse,
  init?: { status?: number },
) {
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

function invalidRequestResponse(
  message: string,
  query = "",
  sessionToken: string | undefined = undefined,
) {
  return buildResponse(
    {
      items: [],
      meta: {
        provider: null,
        sessionToken,
        query,
      },
      error: {
        code: "invalid_request",
        message,
      },
    },
    { status: 400 },
  );
}

function providerFailureResponse(
  errorCode: Extract<
    GeoApiErrorCode,
    "provider_unavailable" | "provider_misconfigured" | "provider_rate_limited"
  >,
  query: string,
  sessionToken: string | undefined,
  provider: GeoAddressSuggestResponse["meta"]["provider"],
) {
  return buildResponse(
    {
      items: [],
      meta: {
        provider,
        sessionToken,
        query,
      },
      error: {
        code: errorCode,
        message: "Address suggestions are temporarily unavailable.",
      },
    },
    { status: 503 },
  );
}

async function parseBody(request: Request): Promise<SuggestRequestBody> {
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

  if (typeof record.query !== "string") {
    throw new GeoValidationError("Query must be a string.");
  }

  if (record.query.length > MAX_SUGGEST_QUERY_LENGTH) {
    throw new GeoValidationError(
      `Query must not exceed ${MAX_SUGGEST_QUERY_LENGTH} characters.`,
    );
  }

  if (
    record.sessionToken !== undefined &&
    typeof record.sessionToken !== "string"
  ) {
    throw new GeoValidationError("Session token must be a string.");
  }

  if (
    typeof record.sessionToken === "string" &&
    record.sessionToken.length > MAX_SUGGEST_SESSION_TOKEN_LENGTH
  ) {
    throw new GeoValidationError(
      `Session token must not exceed ${MAX_SUGGEST_SESSION_TOKEN_LENGTH} characters.`,
    );
  }

  return {
    query: record.query,
    sessionToken:
      typeof record.sessionToken === "string" && record.sessionToken.trim()
        ? record.sessionToken.trim()
        : undefined,
  };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const config = getGeoRuntimeConfig();
  let body: SuggestRequestBody | null = null;

  try {
    body = await parseBody(request);
    const result = await suggestAddresses(body, {
      config,
      signal: request.signal,
    });
    const latencyMs = Date.now() - startedAt;

    console.info(
      JSON.stringify({
        event: "delivery_suggest_success",
        provider: result.meta.provider,
        queryLength: result.meta.query.length,
        sessionTokenPresent: Boolean(result.meta.sessionToken),
        itemsCount: result.items.length,
        latencyMs,
      }),
    );

    return buildResponse(result);
  } catch (error) {
    const latencyMs = Date.now() - startedAt;

    if (error instanceof GeoValidationError) {
      return invalidRequestResponse(
        error.message,
        body?.query.trim() ?? "",
        body?.sessionToken,
      );
    }

    if (error instanceof GeoConfigError) {
      console.warn(
        JSON.stringify({
          event: "delivery_suggest_provider_error",
          provider: config.suggestProvider,
          latencyMs,
          reason: error.code,
        }),
      );

      return providerFailureResponse(
        error.code,
        body?.query.trim() ?? "",
        body?.sessionToken,
        config.suggestProvider,
      );
    }

    if (error instanceof GeoProviderError) {
      console.warn(
        JSON.stringify({
          event: "delivery_suggest_provider_error",
          provider: error.provider,
          latencyMs,
          upstreamStatusCode: error.statusCode ?? null,
          reason: error.code,
        }),
      );

      return providerFailureResponse(
        error.code,
        body?.query.trim() ?? "",
        body?.sessionToken,
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
        event: "delivery_suggest_unknown_error",
        provider: config.suggestProvider,
        latencyMs,
      }),
    );

    return providerFailureResponse(
      "provider_unavailable",
      body?.query.trim() ?? "",
      body?.sessionToken,
      config.suggestProvider,
    );
  }
}

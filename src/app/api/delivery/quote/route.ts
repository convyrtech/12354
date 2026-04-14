import { NextResponse } from "next/server";
import type { DeliveryQuoteRequest } from "@/lib/geo/types";
import { buildDeliveryQuote } from "@/server/geo/quote-service";
import {
  GeoConfigError,
  GeoProviderError,
  GeoValidationError,
} from "@/server/geo/errors";

export const runtime = "nodejs";

function invalidRequestResponse(code: "invalid_request" | "coordinates_required_for_quote", message: string) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status: 400 },
  );
}

function providerFailureResponse(
  code: "provider_unavailable" | "provider_misconfigured" | "provider_rate_limited",
  message: string,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status: 503 },
  );
}

function parseQuoteRequest(payload: unknown): DeliveryQuoteRequest {
  if (!payload || typeof payload !== "object") {
    throw new GeoValidationError("Request body must be an object.");
  }

  const record = payload as Record<string, unknown>;

  if (record.mode !== "suggestion" && record.mode !== "map_pin") {
    throw new GeoValidationError('Mode must be "suggestion" or "map_pin".');
  }

  if (typeof record.lat !== "number" || typeof record.lng !== "number") {
    throw new GeoValidationError("Coordinates are required for quote.");
  }

  if (
    record.lat < -90 ||
    record.lat > 90 ||
    record.lng < -180 ||
    record.lng > 180
  ) {
    throw new GeoValidationError("Coordinates are outside the allowed range.");
  }

  if (
    record.confidence !== "high" &&
    record.confidence !== "medium" &&
    record.confidence !== "low"
  ) {
    throw new GeoValidationError("Confidence must be high, medium, or low.");
  }

  if (record.mode === "suggestion") {
    if (typeof record.rawInput !== "string" || !record.rawInput.trim()) {
      throw new GeoValidationError("Raw input is required for suggestion-based quote.");
    }

    if (
      typeof record.normalizedAddress !== "string" ||
      record.normalizedAddress.trim().length < 3
    ) {
      throw new GeoValidationError(
        "Normalized address is required for suggestion-based quote.",
      );
    }

    return {
      mode: "suggestion",
      rawInput: record.rawInput.trim(),
      normalizedAddress: record.normalizedAddress.trim(),
      lat: record.lat,
      lng: record.lng,
      confidence: record.confidence,
      sessionToken:
        typeof record.sessionToken === "string" && record.sessionToken.trim()
          ? record.sessionToken.trim()
          : undefined,
    };
  }

  return {
    mode: "map_pin",
    lat: record.lat,
    lng: record.lng,
    confidence: record.confidence,
    sourceAddressLabel:
      typeof record.sourceAddressLabel === "string"
        ? record.sourceAddressLabel.trim() || null
        : null,
    sessionToken:
      typeof record.sessionToken === "string" && record.sessionToken.trim()
        ? record.sessionToken.trim()
        : undefined,
  };
}

export async function POST(request: Request) {
  try {
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new GeoValidationError("Request body must be valid JSON.");
    }

    const input = parseQuoteRequest(payload);
    const quote = await buildDeliveryQuote(input, { signal: request.signal });

    return NextResponse.json(quote);
  } catch (error) {
    if (error instanceof GeoValidationError) {
      return invalidRequestResponse(
        error.message === "Coordinates are required for quote."
          ? "coordinates_required_for_quote"
          : "invalid_request",
        error.message,
      );
    }

    if (error instanceof GeoConfigError) {
      return providerFailureResponse(
        error.code,
        "Delivery quote is temporarily unavailable.",
      );
    }

    if (error instanceof GeoProviderError) {
      return providerFailureResponse(
        error.code,
        "Delivery quote is temporarily unavailable.",
      );
    }

    return providerFailureResponse(
      "provider_unavailable",
      "Delivery quote is temporarily unavailable.",
    );
  }
}

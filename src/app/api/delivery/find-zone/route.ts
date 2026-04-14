import { NextResponse } from "next/server";
import type { GeoFindZoneRequest, GeoFindZoneResponse } from "@/lib/geo/types";
import { GeoValidationError } from "@/server/geo/errors";
import { findZone } from "@/server/geo/zone-service";

export const runtime = "nodejs";

function buildResponse(body: GeoFindZoneResponse, status = 200) {
  return NextResponse.json(body, { status });
}

function parseFindZoneRequest(payload: unknown): GeoFindZoneRequest {
  if (!payload || typeof payload !== "object") {
    throw new GeoValidationError("Request body must be an object.");
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.lat !== "number" || typeof record.lng !== "number") {
    throw new GeoValidationError("Lat and lng must be numeric.");
  }

  if (record.lat < -90 || record.lat > 90 || record.lng < -180 || record.lng > 180) {
    throw new GeoValidationError("Coordinates are outside the allowed range.");
  }

  return {
    lat: record.lat,
    lng: record.lng,
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

    const input = parseFindZoneRequest(payload);
    const result = await findZone(input);

    return buildResponse(result);
  } catch (error) {
    if (error instanceof GeoValidationError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "provider_unavailable",
          message: "Zone lookup is temporarily unavailable.",
        },
      },
      { status: 503 },
    );
  }
}

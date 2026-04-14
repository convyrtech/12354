import { NextRequest, NextResponse } from "next/server";
import type {
  CourierLocationWriteRequest,
  CourierLocationWriteResponse,
} from "@/lib/courier/types";
import {
  COURIER_SESSION_COOKIE_NAME,
  requireCourierAuthContext,
} from "@/server/courier/auth-service";
import { CourierDomainError, CourierValidationError } from "@/server/courier/errors";
import { writeCourierLocation } from "@/server/courier/tracking-service";

export const runtime = "nodejs";

function buildResponse(body: CourierLocationWriteResponse, status = 200) {
  return NextResponse.json(body, { status });
}

async function parseBody(request: Request): Promise<CourierLocationWriteRequest> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new CourierValidationError("Request body must be valid JSON.");
  }

  if (!payload || typeof payload !== "object") {
    throw new CourierValidationError("Request body must be an object.");
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.latitude !== "number" || typeof record.longitude !== "number") {
    throw new CourierValidationError("Latitude and longitude must be numbers.");
  }

  return {
    assignmentId: typeof record.assignmentId === "string" ? record.assignmentId : null,
    latitude: record.latitude,
    longitude: record.longitude,
    accuracyMeters:
      typeof record.accuracyMeters === "number" ? record.accuracyMeters : null,
    speedMps: typeof record.speedMps === "number" ? record.speedMps : null,
    headingDegrees:
      typeof record.headingDegrees === "number" ? record.headingDegrees : null,
    batteryLevelPercent:
      typeof record.batteryLevelPercent === "number"
        ? record.batteryLevelPercent
        : null,
    recordedAt: typeof record.recordedAt === "string" ? record.recordedAt : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(COURIER_SESSION_COOKIE_NAME)?.value;
    const { courier } = await requireCourierAuthContext(sessionId);
    const input = await parseBody(request);
    const result = await writeCourierLocation(courier.id, input);
    return buildResponse(result);
  } catch (error) {
    if (error instanceof CourierDomainError) {
      return buildResponse(
        {
          accepted: false,
          receivedAt: new Date().toISOString(),
          error: {
            code: error.code,
            message: error.message,
          },
        },
        error.statusCode,
      );
    }

    return buildResponse(
      {
        accepted: false,
        receivedAt: new Date().toISOString(),
        error: {
          code: "unavailable",
          message: "Courier location ingest is temporarily unavailable.",
        },
      },
      503,
    );
  }
}

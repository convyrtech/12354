import { NextResponse } from "next/server";
import type {
  CourierAuthLoginRequest,
  CourierAuthLoginResponse,
} from "@/lib/courier/types";
import {
  COURIER_SESSION_COOKIE_NAME,
  getCourierSessionCookieOptions,
  loginCourier,
} from "@/server/courier/auth-service";
import { CourierDomainError, CourierValidationError } from "@/server/courier/errors";

export const runtime = "nodejs";

function buildResponse(body: CourierAuthLoginResponse, status = 200) {
  return NextResponse.json(body, { status });
}

async function parseBody(request: Request): Promise<CourierAuthLoginRequest> {
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

  if (typeof record.phone !== "string") {
    throw new CourierValidationError("Phone must be a string.");
  }

  if (
    record.platform !== "ios" &&
    record.platform !== "android" &&
    record.platform !== "web"
  ) {
    throw new CourierValidationError("Platform must be ios, android, or web.");
  }

  if (typeof record.deviceId !== "string") {
    throw new CourierValidationError("Device ID must be a string.");
  }

  return {
    phone: record.phone,
    platform: record.platform,
    deviceId: record.deviceId,
    code: typeof record.code === "string" ? record.code : null,
    appVersion: typeof record.appVersion === "string" ? record.appVersion : null,
    pushToken: typeof record.pushToken === "string" ? record.pushToken : null,
  };
}

export async function POST(request: Request) {
  try {
    const input = await parseBody(request);
    const result = await loginCourier(input);
    const response = buildResponse(result, 200);

    response.cookies.set(
      COURIER_SESSION_COOKIE_NAME,
      result.session!.id,
      getCourierSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    if (error instanceof CourierDomainError) {
      return buildResponse(
        {
          courier: null,
          session: null,
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
        courier: null,
        session: null,
        error: {
          code: "unavailable",
          message: "Courier login is temporarily unavailable.",
        },
      },
      503,
    );
  }
}

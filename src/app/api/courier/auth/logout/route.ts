import { NextRequest, NextResponse } from "next/server";
import type { CourierAuthLogoutResponse } from "@/lib/courier/types";
import {
  COURIER_SESSION_COOKIE_NAME,
  getCourierSessionCookieOptions,
  logoutCourierSession,
} from "@/server/courier/auth-service";
import { CourierDomainError } from "@/server/courier/errors";

export const runtime = "nodejs";

function buildResponse(body: CourierAuthLogoutResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(COURIER_SESSION_COOKIE_NAME)?.value;

    if (sessionId) {
      await logoutCourierSession(sessionId);
    }

    const response = buildResponse({ loggedOut: true });
    response.cookies.set(COURIER_SESSION_COOKIE_NAME, "", {
      ...getCourierSessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    if (error instanceof CourierDomainError) {
      return buildResponse(
        {
          loggedOut: false,
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
        loggedOut: false,
        error: {
          code: "unavailable",
          message: "Courier logout is temporarily unavailable.",
        },
      },
      503,
    );
  }
}

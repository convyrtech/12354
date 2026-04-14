import { NextRequest, NextResponse } from "next/server";
import type { CourierMeResponse } from "@/lib/courier/types";
import {
  COURIER_SESSION_COOKIE_NAME,
  requireCourierAuthContext,
} from "@/server/courier/auth-service";
import { CourierDomainError } from "@/server/courier/errors";

export const runtime = "nodejs";

function buildResponse(body: CourierMeResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(COURIER_SESSION_COOKIE_NAME)?.value;
    const { courier, session } = await requireCourierAuthContext(sessionId);
    return buildResponse({ courier, session });
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
          message: "Courier session is temporarily unavailable.",
        },
      },
      503,
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import type { CourierActiveJobsResponse } from "@/lib/courier/types";
import {
  COURIER_SESSION_COOKIE_NAME,
  requireCourierAuthContext,
} from "@/server/courier/auth-service";
import { CourierDomainError } from "@/server/courier/errors";
import { listCourierActiveJobs } from "@/server/courier/job-service";

export const runtime = "nodejs";

function buildResponse(body: CourierActiveJobsResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(COURIER_SESSION_COOKIE_NAME)?.value;
    const { courier } = await requireCourierAuthContext(sessionId);
    const items = await listCourierActiveJobs(courier.id);
    return buildResponse({ items });
  } catch (error) {
    if (error instanceof CourierDomainError) {
      return buildResponse(
        {
          items: [],
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
        items: [],
        error: {
          code: "unavailable",
          message: "Courier jobs are temporarily unavailable.",
        },
      },
      503,
    );
  }
}

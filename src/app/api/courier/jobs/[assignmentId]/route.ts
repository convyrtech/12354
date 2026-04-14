import { NextRequest, NextResponse } from "next/server";
import type { CourierJobDetailResponse } from "@/lib/courier/types";
import {
  COURIER_SESSION_COOKIE_NAME,
  requireCourierAuthContext,
} from "@/server/courier/auth-service";
import { CourierDomainError } from "@/server/courier/errors";
import { getCourierJobDetail } from "@/server/courier/job-service";

export const runtime = "nodejs";

function buildResponse(body: CourierJobDetailResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ assignmentId: string }> },
) {
  try {
    const sessionId = request.cookies.get(COURIER_SESSION_COOKIE_NAME)?.value;
    const { courier } = await requireCourierAuthContext(sessionId);
    const { assignmentId } = await context.params;
    const detail = await getCourierJobDetail(courier.id, assignmentId);
    return buildResponse(detail);
  } catch (error) {
    if (error instanceof CourierDomainError) {
      return buildResponse(
        {
          assignment: null,
          timeline: [],
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
        assignment: null,
        timeline: [],
        error: {
          code: "unavailable",
          message: "Courier job detail is temporarily unavailable.",
        },
      },
      503,
    );
  }
}

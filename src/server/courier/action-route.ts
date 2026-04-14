import { NextRequest, NextResponse } from "next/server";
import type {
  CourierAssignmentActionRequest,
  CourierAssignmentActionResponse,
  CourierAssignmentActionType,
} from "@/lib/courier/types";
import {
  COURIER_SESSION_COOKIE_NAME,
  requireCourierAuthContext,
} from "./auth-service";
import { CourierDomainError } from "./errors";
import { applyCourierAssignmentAction } from "./job-service";

function buildResponse(body: CourierAssignmentActionResponse, status = 200) {
  return NextResponse.json(body, { status });
}

async function parseBody(request: Request): Promise<CourierAssignmentActionRequest> {
  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      return {};
    }

    const record = payload as Record<string, unknown>;
    return {
      note: typeof record.note === "string" ? record.note : null,
      failureReason:
        typeof record.failureReason === "string" ? record.failureReason : null,
    };
  } catch {
    return {};
  }
}

export async function handleCourierAssignmentActionRoute(
  request: NextRequest,
  context: { params: Promise<{ assignmentId: string }> },
  action: CourierAssignmentActionType,
) {
  try {
    const sessionId = request.cookies.get(COURIER_SESSION_COOKIE_NAME)?.value;
    const { courier } = await requireCourierAuthContext(sessionId);
    const body = await parseBody(request);
    const { assignmentId } = await context.params;
    const assignment = await applyCourierAssignmentAction(
      courier.id,
      assignmentId,
      action,
      body,
    );

    return buildResponse({ assignment });
  } catch (error) {
    if (error instanceof CourierDomainError) {
      return buildResponse(
        {
          assignment: null,
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
        error: {
          code: "unavailable",
          message: "Courier action is temporarily unavailable.",
        },
      },
      503,
    );
  }
}

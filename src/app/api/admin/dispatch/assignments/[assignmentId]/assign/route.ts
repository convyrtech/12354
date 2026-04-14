import { NextResponse } from "next/server";
import type {
  AdminAssignCourierRequest,
  AdminAssignCourierResponse,
} from "@/lib/courier/types";
import { assignCourierToDeliveryAssignment } from "@/server/courier/assignment-service";
import { CourierDomainError, CourierValidationError } from "@/server/courier/errors";

export const runtime = "nodejs";

function buildResponse(body: AdminAssignCourierResponse, status = 200) {
  return NextResponse.json(body, { status });
}

async function parseBody(request: Request): Promise<AdminAssignCourierRequest> {
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

  if (typeof record.courierId !== "string") {
    throw new CourierValidationError("Courier ID must be a string.");
  }

  return {
    courierId: record.courierId,
    statusNote: typeof record.statusNote === "string" ? record.statusNote : null,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  try {
    const [{ assignmentId }, input] = await Promise.all([context.params, parseBody(request)]);
    const assignment = await assignCourierToDeliveryAssignment(assignmentId, input);
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
          message: "Assignment update is temporarily unavailable.",
        },
      },
      503,
    );
  }
}

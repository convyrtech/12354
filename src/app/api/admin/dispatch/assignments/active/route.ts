import { NextResponse } from "next/server";
import type { AdminDispatchActiveAssignmentsResponse } from "@/lib/courier/types";
import { listActiveAssignments } from "@/server/courier/assignment-service";
import { CourierDomainError } from "@/server/courier/errors";

export const runtime = "nodejs";

function buildResponse(body: AdminDispatchActiveAssignmentsResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET() {
  try {
    const items = await listActiveAssignments();
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
          message: "Active assignments are temporarily unavailable.",
        },
      },
      503,
    );
  }
}

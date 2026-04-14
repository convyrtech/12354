import { NextResponse } from "next/server";
import type { AssignmentTrackResponse } from "@/lib/courier/types";
import { CourierDomainError } from "@/server/courier/errors";
import { getAssignmentTrack } from "@/server/courier/tracking-service";

export const runtime = "nodejs";

function buildResponse(body: AssignmentTrackResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  try {
    const { assignmentId } = await context.params;
    const track = await getAssignmentTrack(assignmentId);
    return buildResponse(track);
  } catch (error) {
    if (error instanceof CourierDomainError) {
      return buildResponse(
        {
          assignmentId: "",
          session: null,
          latestLocation: null,
          recentLocations: [],
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
        assignmentId: "",
        session: null,
        latestLocation: null,
        recentLocations: [],
        error: {
          code: "unavailable",
          message: "Assignment track is temporarily unavailable.",
        },
      },
      503,
    );
  }
}

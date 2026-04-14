import { NextResponse } from "next/server";
import { CourierDomainError } from "@/server/courier/errors";
import { ensureAssignmentPublicTrackingToken } from "@/server/courier/public-tracking-service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  try {
    const { assignmentId } = await context.params;
    const tokenRecord = await ensureAssignmentPublicTrackingToken(assignmentId);
    return NextResponse.json({ tokenRecord }, { status: 201 });
  } catch (error) {
    if (error instanceof CourierDomainError) {
      return NextResponse.json(
        {
          tokenRecord: null,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        tokenRecord: null,
        error: {
          code: "unavailable",
          message: "Tracking token is temporarily unavailable.",
        },
      },
      { status: 503 },
    );
  }
}

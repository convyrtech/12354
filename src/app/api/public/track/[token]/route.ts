import { NextResponse } from "next/server";
import type { PublicTrackingResponse } from "@/lib/courier/types";
import { CourierDomainError } from "@/server/courier/errors";
import { buildPublicTrackingResponse } from "@/server/courier/public-tracking-service";

export const runtime = "nodejs";

function buildResponse(body: PublicTrackingResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const response = await buildPublicTrackingResponse(token);
    return buildResponse(response);
  } catch (error) {
    if (error instanceof CourierDomainError) {
      return buildResponse(
        {
          tracking: null,
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
        tracking: null,
        error: {
          code: "unavailable",
          message: "Public tracking is temporarily unavailable.",
        },
      },
      503,
    );
  }
}

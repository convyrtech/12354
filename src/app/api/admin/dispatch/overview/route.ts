import { NextResponse } from "next/server";
import type { AdminDispatchOverviewResponse } from "@/lib/courier/types";
import { buildDispatchOverview } from "@/server/courier/assignment-service";
import { CourierDomainError } from "@/server/courier/errors";

export const runtime = "nodejs";

function buildResponse(body: AdminDispatchOverviewResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET() {
  try {
    const overview = await buildDispatchOverview();
    return buildResponse(overview);
  } catch (error) {
    if (error instanceof CourierDomainError) {
      return buildResponse(
        {
          couriers: [],
          assignments: [],
          latestLocations: [],
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
        couriers: [],
        assignments: [],
        latestLocations: [],
        error: {
          code: "unavailable",
          message: "Dispatch overview is temporarily unavailable.",
        },
      },
      503,
    );
  }
}

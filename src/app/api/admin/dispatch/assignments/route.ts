import { NextResponse } from "next/server";
import type {
  AdminCreateAssignmentRequest,
  AdminCreateAssignmentResponse,
  AdminDispatchActiveAssignmentsResponse,
} from "@/lib/courier/types";
import {
  createDeliveryAssignment,
  listActiveAssignments,
} from "@/server/courier/assignment-service";
import { CourierDomainError, CourierValidationError } from "@/server/courier/errors";

export const runtime = "nodejs";

function buildCreateResponse(body: AdminCreateAssignmentResponse, status = 200) {
  return NextResponse.json(body, { status });
}

function buildListResponse(body: AdminDispatchActiveAssignmentsResponse, status = 200) {
  return NextResponse.json(body, { status });
}

async function parseCreateAssignmentBody(request: Request): Promise<AdminCreateAssignmentRequest> {
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

  if (typeof record.orderId !== "string") {
    throw new CourierValidationError("Order ID must be a string.");
  }

  if (typeof record.orderLabel !== "string") {
    throw new CourierValidationError("Order label must be a string.");
  }

  if (
    record.courierId !== undefined &&
    record.courierId !== null &&
    typeof record.courierId !== "string"
  ) {
    throw new CourierValidationError("Courier ID must be a string when provided.");
  }

  if (typeof record.dropoffAddressLabel !== "string") {
    throw new CourierValidationError("Dropoff address label must be a string.");
  }

  if (
    record.dropoffLat !== undefined &&
    record.dropoffLat !== null &&
    typeof record.dropoffLat !== "number"
  ) {
    throw new CourierValidationError("Dropoff latitude must be a number when provided.");
  }

  if (
    record.dropoffLng !== undefined &&
    record.dropoffLng !== null &&
    typeof record.dropoffLng !== "number"
  ) {
    throw new CourierValidationError("Dropoff longitude must be a number when provided.");
  }

  return {
    orderId: record.orderId,
    orderLabel: record.orderLabel,
    courierId:
      typeof record.courierId === "string"
        ? record.courierId
        : record.courierId === null || typeof record.courierId === "undefined"
          ? null
          : null,
    kitchenId: typeof record.kitchenId === "string" ? record.kitchenId : null,
    kitchenLabel: typeof record.kitchenLabel === "string" ? record.kitchenLabel : null,
    customerLabel: typeof record.customerLabel === "string" ? record.customerLabel : null,
    dropoffAddressLabel: record.dropoffAddressLabel,
    dropoffLat: typeof record.dropoffLat === "number" ? record.dropoffLat : null,
    dropoffLng: typeof record.dropoffLng === "number" ? record.dropoffLng : null,
    statusNote: typeof record.statusNote === "string" ? record.statusNote : null,
  };
}

export async function GET() {
  try {
    const items = await listActiveAssignments();
    return buildListResponse({ items });
  } catch (error) {
    if (error instanceof CourierDomainError) {
      return buildListResponse(
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

    return buildListResponse(
      {
        items: [],
        error: {
          code: "unavailable",
          message: "Assignments are temporarily unavailable.",
        },
      },
      503,
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseCreateAssignmentBody(request);
    const assignment = await createDeliveryAssignment(input);
    return buildCreateResponse({ assignment }, 201);
  } catch (error) {
    if (error instanceof CourierDomainError) {
      return buildCreateResponse(
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

    return buildCreateResponse(
      {
        assignment: null,
        error: {
          code: "unavailable",
          message: "Assignment creation is temporarily unavailable.",
        },
      },
      503,
    );
  }
}

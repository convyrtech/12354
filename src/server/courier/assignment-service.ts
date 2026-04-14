import type {
  AdminAssignCourierRequest,
  AdminCreateAssignmentRequest,
  CourierLocationSnapshot,
  DeliveryAssignment,
} from "@/lib/courier/types";
import { CourierNotFoundError, CourierValidationError } from "./errors";
import { appendDeliveryStatusEvent } from "./event-service";
import { getCourierRepositories } from "./repositories/runtime";
import type { CourierRepositories } from "./types";
import { createCourierEntityId, nowIso } from "./utils";

const LOCATION_STALE_MS = 2 * 60 * 1000;

function validateAssignmentCreateInput(input: AdminCreateAssignmentRequest) {
  if (!input.orderId.trim()) {
    throw new CourierValidationError("Order ID is required.");
  }

  if (!input.orderLabel.trim()) {
    throw new CourierValidationError("Order label is required.");
  }

  if (!input.dropoffAddressLabel.trim()) {
    throw new CourierValidationError("Dropoff address label is required.");
  }

  if (
    input.dropoffLat !== undefined &&
    input.dropoffLat !== null &&
    (input.dropoffLat < -90 || input.dropoffLat > 90)
  ) {
    throw new CourierValidationError("Dropoff latitude is outside the allowed range.");
  }

  if (
    input.dropoffLng !== undefined &&
    input.dropoffLng !== null &&
    (input.dropoffLng < -180 || input.dropoffLng > 180)
  ) {
    throw new CourierValidationError("Dropoff longitude is outside the allowed range.");
  }
}

function validateAssignCourierInput(input: AdminAssignCourierRequest) {
  if (!input.courierId.trim()) {
    throw new CourierValidationError("Courier ID is required.");
  }
}

function resolveCreateStatusNote(
  input: AdminCreateAssignmentRequest,
  courierDisplayName: string | null,
) {
  if (input.statusNote?.trim()) {
    return input.statusNote.trim();
  }

  if (courierDisplayName) {
    return `Назначено курьеру ${courierDisplayName}.`;
  }

  return "Заказ ожидает назначения курьера.";
}

function toLocationSnapshot(
  receivedAt: string,
  ping: {
    courierId: string;
    assignmentId: string | null;
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
    speedMps: number | null;
    headingDegrees: number | null;
    recordedAt: string;
  },
): CourierLocationSnapshot {
  return {
    courierId: ping.courierId,
    assignmentId: ping.assignmentId,
    latitude: ping.latitude,
    longitude: ping.longitude,
    accuracyMeters: ping.accuracyMeters,
    speedMps: ping.speedMps,
    headingDegrees: ping.headingDegrees,
    recordedAt: ping.recordedAt,
    receivedAt,
    stale: Date.now() - new Date(receivedAt).getTime() > LOCATION_STALE_MS,
  };
}

export async function createDeliveryAssignment(
  input: AdminCreateAssignmentRequest,
  options?: {
    repositories?: CourierRepositories;
  },
): Promise<DeliveryAssignment> {
  validateAssignmentCreateInput(input);

  const repositories = options?.repositories ?? (await getCourierRepositories());
  const courierId = input.courierId?.trim() || null;
  const courier = courierId ? await repositories.couriers.getById(courierId) : null;

  if (courierId && !courier) {
    throw new CourierNotFoundError("Courier was not found for assignment.");
  }

  const timestamp = nowIso();
  const assignment: DeliveryAssignment = {
    id: createCourierEntityId("assignment"),
    orderId: input.orderId.trim(),
    orderLabel: input.orderLabel.trim(),
    courierId: courier?.id ?? null,
    kitchenId: input.kitchenId?.trim() || null,
    kitchenLabel: input.kitchenLabel?.trim() || null,
    customerLabel: input.customerLabel?.trim() || null,
    dropoffAddressLabel: input.dropoffAddressLabel.trim(),
    dropoffLat: input.dropoffLat ?? null,
    dropoffLng: input.dropoffLng ?? null,
    status: courier ? "assigned" : "pending_assignment",
    statusNote: resolveCreateStatusNote(input, courier?.displayName ?? null),
    assignedAt: courier ? timestamp : null,
    acceptedAt: null,
    pickupStartedAt: null,
    pickedUpAt: null,
    arrivedAtDropoffAt: null,
    deliveredAt: null,
    failedAt: null,
    cancellationReason: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await repositories.assignments.upsert(assignment);
  await appendDeliveryStatusEvent(
    {
      assignmentId: assignment.id,
      orderId: assignment.orderId,
      courierId: assignment.courierId,
      eventType: "assignment_created",
      eventPayload: {
        orderLabel: assignment.orderLabel,
        courierId: assignment.courierId,
        statusNote: assignment.statusNote,
      },
      occurredAt: timestamp,
    },
    { repositories },
  );

  return assignment;
}

export async function assignCourierToDeliveryAssignment(
  assignmentId: string,
  input: AdminAssignCourierRequest,
  options?: {
    repositories?: CourierRepositories;
  },
): Promise<DeliveryAssignment> {
  if (!assignmentId.trim()) {
    throw new CourierValidationError("Assignment ID is required.");
  }

  validateAssignCourierInput(input);

  const repositories = options?.repositories ?? (await getCourierRepositories());
  const [assignment, courier] = await Promise.all([
    repositories.assignments.getById(assignmentId.trim()),
    repositories.couriers.getById(input.courierId.trim()),
  ]);

  if (!assignment) {
    throw new CourierNotFoundError("Assignment was not found.");
  }

  if (!courier) {
    throw new CourierNotFoundError("Courier was not found for assignment.");
  }

  if (
    assignment.status !== "pending_assignment" &&
    !(assignment.status === "assigned" && assignment.acceptedAt === null)
  ) {
    throw new CourierValidationError(
      "Only pending or not-yet-accepted assignments can be assigned.",
    );
  }

  if (assignment.courierId === courier.id && assignment.status === "assigned") {
    return assignment;
  }

  const timestamp = nowIso();
  const statusNote = input.statusNote?.trim() || `Назначено курьеру ${courier.displayName}.`;
  const nextAssignment: DeliveryAssignment = {
    ...assignment,
    courierId: courier.id,
    status: "assigned",
    statusNote,
    assignedAt: timestamp,
    updatedAt: timestamp,
  };

  await repositories.assignments.upsert(nextAssignment);

  const activeSession = await repositories.tracking.getActiveSessionByAssignmentId(
    nextAssignment.id,
  );

  if (activeSession && activeSession.courierId !== courier.id) {
    await repositories.tracking.upsertSession({
      ...activeSession,
      courierId: courier.id,
    });
  }

  await appendDeliveryStatusEvent(
    {
      assignmentId: nextAssignment.id,
      orderId: nextAssignment.orderId,
      courierId: courier.id,
      eventType: "courier_assigned",
      eventPayload: {
        courierId: courier.id,
        previousCourierId: assignment.courierId,
        statusNote,
      },
      occurredAt: timestamp,
    },
    { repositories },
  );

  return nextAssignment;
}

export async function listActiveAssignments(options?: {
  repositories?: CourierRepositories;
}) {
  const repositories = options?.repositories ?? (await getCourierRepositories());
  return repositories.assignments.list({ onlyActive: true });
}

export async function listDispatchCouriers(options?: {
  repositories?: CourierRepositories;
}) {
  const repositories = options?.repositories ?? (await getCourierRepositories());
  return repositories.couriers.list();
}

export async function buildDispatchOverview(options?: {
  repositories?: CourierRepositories;
}) {
  const repositories = options?.repositories ?? (await getCourierRepositories());
  const [couriers, assignments] = await Promise.all([
    repositories.couriers.list(),
    repositories.assignments.list({ onlyActive: true }),
  ]);

  const latestLocations = (
    await Promise.all(
      couriers.map(async (courier) => {
        const ping = await repositories.tracking.getLatestLocationPing({
          courierId: courier.id,
        });

        if (!ping) {
          return null;
        }

        return toLocationSnapshot(ping.receivedAt, ping);
      }),
    )
  ).filter((snapshot): snapshot is CourierLocationSnapshot => Boolean(snapshot));

  return {
    couriers,
    assignments,
    latestLocations,
  };
}

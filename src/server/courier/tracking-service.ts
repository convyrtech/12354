import type {
  AssignmentTrackResponse,
  CourierLocationPing,
  CourierLocationSnapshot,
  CourierLocationWriteRequest,
  DeliveryTrackingSession,
} from "@/lib/courier/types";
import {
  CourierConflictError,
  CourierNotFoundError,
  CourierValidationError,
} from "./errors";
import { appendDeliveryStatusEvent } from "./event-service";
import { getCourierRepositories } from "./repositories/runtime";
import type { CourierRepositories } from "./types";
import { createCourierEntityId, nowIso } from "./utils";

const LOCATION_STALE_MS = 2 * 60 * 1000;

function toLocationSnapshot(
  ping: CourierLocationPing | null,
): CourierLocationSnapshot | null {
  if (!ping) {
    return null;
  }

  return {
    courierId: ping.courierId,
    assignmentId: ping.assignmentId,
    latitude: ping.latitude,
    longitude: ping.longitude,
    accuracyMeters: ping.accuracyMeters,
    speedMps: ping.speedMps,
    headingDegrees: ping.headingDegrees,
    recordedAt: ping.recordedAt,
    receivedAt: ping.receivedAt,
    stale: Date.now() - new Date(ping.receivedAt).getTime() > LOCATION_STALE_MS,
  };
}

function validateLocationWriteInput(input: CourierLocationWriteRequest) {
  if (typeof input.latitude !== "number" || typeof input.longitude !== "number") {
    throw new CourierValidationError("Latitude and longitude are required.");
  }

  if (input.latitude < -90 || input.latitude > 90) {
    throw new CourierValidationError("Latitude is outside the allowed range.");
  }

  if (input.longitude < -180 || input.longitude > 180) {
    throw new CourierValidationError("Longitude is outside the allowed range.");
  }

  if (
    input.accuracyMeters !== undefined &&
    input.accuracyMeters !== null &&
    input.accuracyMeters < 0
  ) {
    throw new CourierValidationError("Accuracy must be zero or higher.");
  }
}

async function ensureTrackingSession(
  repositories: CourierRepositories,
  assignmentId: string,
  courierId: string,
): Promise<DeliveryTrackingSession> {
  const existing = await repositories.tracking.getActiveSessionByAssignmentId(assignmentId);

  if (existing) {
    if (existing.courierId === courierId) {
      return existing;
    }

    const nextSession: DeliveryTrackingSession = {
      ...existing,
      courierId,
      provider: "direct_mobile",
    };

    await repositories.tracking.upsertSession(nextSession);
    return nextSession;
  }

  const now = nowIso();
  const session: DeliveryTrackingSession = {
    id: createCourierEntityId("tracking_session"),
    assignmentId,
    courierId,
    trackingMode: "active_delivery",
    provider: "direct_mobile",
    startedAt: now,
    endedAt: null,
    publicTrackingToken: null,
    publicTrackingExpiresAt: null,
    lastLocationAt: null,
  };

  await repositories.tracking.upsertSession(session);
  return session;
}

export async function writeCourierLocation(
  courierId: string,
  input: CourierLocationWriteRequest,
  options?: {
    repositories?: CourierRepositories;
  },
) {
  validateLocationWriteInput(input);

  const repositories = options?.repositories ?? (await getCourierRepositories());
  const courier = await repositories.couriers.getById(courierId);

  if (!courier) {
    throw new CourierNotFoundError("Courier was not found.");
  }

  const assignmentId: string | null = input.assignmentId?.trim() || null;

  if (assignmentId) {
    const assignment = await repositories.assignments.getById(assignmentId);

    if (!assignment) {
      throw new CourierNotFoundError("Assignment was not found for tracking.");
    }

    if (assignment.courierId !== courierId) {
      throw new CourierConflictError("Assignment belongs to another courier.");
    }

    const session = await ensureTrackingSession(repositories, assignmentId, courierId);
    await repositories.tracking.upsertSession({
      ...session,
      lastLocationAt: nowIso(),
    });
  }

  const receivedAt = nowIso();
  const recordedAt = input.recordedAt?.trim() || receivedAt;
  const ping: CourierLocationPing = {
    id: createCourierEntityId("location_ping"),
    courierId,
    assignmentId,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: input.accuracyMeters ?? null,
    speedMps: input.speedMps ?? null,
    headingDegrees: input.headingDegrees ?? null,
    batteryLevelPercent: input.batteryLevelPercent ?? null,
    source: "courier_app",
    recordedAt,
    receivedAt,
  };

  await repositories.tracking.appendLocationPing(ping);

  if (assignmentId) {
    const assignment = await repositories.assignments.getById(assignmentId);

    if (assignment) {
      await appendDeliveryStatusEvent(
        {
          assignmentId: assignment.id,
          orderId: assignment.orderId,
          courierId,
          eventType: "courier_location_updated",
          eventPayload: {
            latitude: ping.latitude,
            longitude: ping.longitude,
            accuracyMeters: ping.accuracyMeters,
          },
          occurredAt: receivedAt,
        },
        { repositories },
      );
    }
  }

  return {
    accepted: true,
    receivedAt,
  };
}

export async function getAssignmentTrack(
  assignmentId: string,
  options?: {
    repositories?: CourierRepositories;
    limit?: number;
  },
): Promise<AssignmentTrackResponse> {
  const repositories = options?.repositories ?? (await getCourierRepositories());
  const assignment = await repositories.assignments.getById(assignmentId);

  if (!assignment) {
    throw new CourierNotFoundError("Assignment was not found.");
  }

  const [session, latestLocation, recentLocations] = await Promise.all([
    repositories.tracking.getActiveSessionByAssignmentId(assignmentId),
    repositories.tracking.getLatestLocationPing({ assignmentId }),
    repositories.tracking.listLocationPings({
      assignmentId,
      limit: options?.limit ?? 25,
    }),
  ]);

  return {
    assignmentId,
    session,
    latestLocation: toLocationSnapshot(latestLocation),
    recentLocations,
  };
}

export async function getCourierLatestLocationSnapshot(
  courierId: string,
  options?: {
    repositories?: CourierRepositories;
  },
) {
  const repositories = options?.repositories ?? (await getCourierRepositories());
  const ping = await repositories.tracking.getLatestLocationPing({ courierId });
  return toLocationSnapshot(ping);
}

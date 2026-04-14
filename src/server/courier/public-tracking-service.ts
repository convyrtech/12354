import type {
  DeliveryTrackingSession,
  PublicTrackingResponse,
  PublicTrackingTokenRecord,
  PublicTrackingView,
} from "@/lib/courier/types";
import {
  CourierNotFoundError,
  CourierTrackingTokenError,
} from "./errors";
import { listAssignmentEvents } from "./event-service";
import { getCourierRepositories } from "./repositories/runtime";
import type { CourierRepositories } from "./types";
import { createCourierEntityId, nowIso } from "./utils";

const PUBLIC_TRACKING_TTL_HOURS = 12;

function minutesAgo(value: number) {
  return new Date(Date.now() - value * 60 * 1000).toISOString();
}

function getInvestorDemoTrackingView(token: string): PublicTrackingView {
  const now = nowIso();

  return {
    token,
    orderId: "order_investor_demo",
    orderLabel: "TR-INVESTOR-DEMO",
    assignmentStatus: "en_route_to_customer",
    courier: {
      id: "courier_investor_demo",
      displayName: "Артем",
      vehicleType: "car",
    },
    destination: {
      label: "Центральный вход, Тверская, 7",
      lat: 55.7584,
      lng: 37.6132,
    },
    etaLabel: "18-24 мин",
    liveLocation: {
      courierId: "courier_investor_demo",
      assignmentId: "assignment_investor_demo",
      latitude: 55.7512,
      longitude: 37.5968,
      accuracyMeters: 12,
      speedMps: 6.4,
      headingDegrees: 74,
      recordedAt: minutesAgo(1),
      receivedAt: minutesAgo(1),
      stale: false,
    },
    timeline: [
      {
        id: "event_demo_1",
        assignmentId: "assignment_investor_demo",
        orderId: "order_investor_demo",
        courierId: null,
        eventType: "assignment_created",
        eventPayload: {
          statusNote: "Команда собрала маршрут и закрепила точку передачи заказа.",
        },
        occurredAt: minutesAgo(36),
        createdAt: minutesAgo(36),
      },
      {
        id: "event_demo_2",
        assignmentId: "assignment_investor_demo",
        orderId: "order_investor_demo",
        courierId: "courier_investor_demo",
        eventType: "courier_assigned",
        eventPayload: {
          statusNote: "Заказ передан выделенному курьеру для аккуратной подачи по маршруту.",
        },
        occurredAt: minutesAgo(27),
        createdAt: minutesAgo(27),
      },
      {
        id: "event_demo_3",
        assignmentId: "assignment_investor_demo",
        orderId: "order_investor_demo",
        courierId: "courier_investor_demo",
        eventType: "order_picked_up",
        eventPayload: {
          statusNote: "Курьер забрал заказ с кухни в Осоргино и вышел на маршрут.",
        },
        occurredAt: minutesAgo(14),
        createdAt: minutesAgo(14),
      },
      {
        id: "event_demo_4",
        assignmentId: "assignment_investor_demo",
        orderId: "order_investor_demo",
        courierId: "courier_investor_demo",
        eventType: "courier_arrived_dropoff",
        eventPayload: {
          statusNote: "Курьер движется к точке вручения, гостю уже можно быть на связи.",
        },
        occurredAt: minutesAgo(2),
        createdAt: minutesAgo(2),
      },
    ],
    lastUpdatedAt: now,
  };
}

async function ensurePublicTrackingToken(
  repositories: CourierRepositories,
  assignmentId: string,
  orderId: string,
) {
  const existing = (await repositories.trackingTokens.listByAssignmentId(assignmentId)).find(
    (tokenRecord) => tokenRecord.revokedAt === null && tokenRecord.expiresAt > nowIso(),
  );

  if (existing) {
    return existing;
  }

  const createdAt = nowIso();
  const tokenRecord: PublicTrackingTokenRecord = {
    token: createCourierEntityId("track"),
    assignmentId,
    orderId,
    createdAt,
    expiresAt: new Date(
      Date.now() + PUBLIC_TRACKING_TTL_HOURS * 60 * 60 * 1000,
    ).toISOString(),
    revokedAt: null,
  };

  await repositories.trackingTokens.upsert(tokenRecord);
  return tokenRecord;
}

export async function ensureAssignmentPublicTrackingToken(
  assignmentId: string,
  options?: {
    repositories?: CourierRepositories;
  },
) {
  const repositories = options?.repositories ?? (await getCourierRepositories());
  const assignment = await repositories.assignments.getById(assignmentId);

  if (!assignment) {
    throw new CourierNotFoundError("Assignment was not found.");
  }

  const tokenRecord = await ensurePublicTrackingToken(
    repositories,
    assignment.id,
    assignment.orderId,
  );

  const activeSession = await repositories.tracking.getActiveSessionByAssignmentId(assignment.id);

  if (activeSession) {
    await repositories.tracking.upsertSession({
      ...activeSession,
      publicTrackingToken: tokenRecord.token,
      publicTrackingExpiresAt: tokenRecord.expiresAt,
    });
  } else {
    const session: DeliveryTrackingSession = {
      id: createCourierEntityId("tracking_session"),
      assignmentId: assignment.id,
      courierId: assignment.courierId,
      trackingMode: "active_delivery",
      provider: "manual",
      startedAt: assignment.assignedAt ?? assignment.createdAt,
      endedAt: null,
      publicTrackingToken: tokenRecord.token,
      publicTrackingExpiresAt: tokenRecord.expiresAt,
      lastLocationAt: null,
    };

    await repositories.tracking.upsertSession(session);
  }

  return tokenRecord;
}

export async function getPublicTrackingViewByToken(
  token: string,
  options?: {
    repositories?: CourierRepositories;
  },
): Promise<PublicTrackingView> {
  if (token === "investor-demo") {
    return getInvestorDemoTrackingView(token);
  }

  const repositories = options?.repositories ?? (await getCourierRepositories());
  const tokenRecord = await repositories.trackingTokens.getByToken(token);

  if (!tokenRecord || tokenRecord.revokedAt !== null) {
    throw new CourierTrackingTokenError(
      "tracking_token_invalid",
      "Tracking link is invalid.",
    );
  }

  if (tokenRecord.expiresAt <= nowIso()) {
    throw new CourierTrackingTokenError(
      "tracking_token_expired",
      "Tracking link has expired.",
    );
  }

  const assignment = await repositories.assignments.getById(tokenRecord.assignmentId);

  if (!assignment) {
    throw new CourierNotFoundError("Assignment was not found for tracking.");
  }

  const [courier, latestLocation, timeline] = await Promise.all([
    assignment.courierId
      ? repositories.couriers.getById(assignment.courierId)
      : Promise.resolve(null),
    repositories.tracking.getLatestLocationPing({ assignmentId: assignment.id }),
    listAssignmentEvents(assignment.id, { repositories, limit: 50 }),
  ]);

  return {
    token: tokenRecord.token,
    orderId: assignment.orderId,
    orderLabel: assignment.orderLabel,
    assignmentStatus: assignment.status,
    courier: {
      id: courier?.id ?? null,
      displayName: courier?.displayName ?? null,
      vehicleType: courier?.vehicleType ?? null,
    },
    destination: {
      label: assignment.dropoffAddressLabel,
      lat: assignment.dropoffLat,
      lng: assignment.dropoffLng,
    },
    etaLabel: null,
    liveLocation: latestLocation
      ? {
          courierId: latestLocation.courierId,
          assignmentId: latestLocation.assignmentId,
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          accuracyMeters: latestLocation.accuracyMeters,
          speedMps: latestLocation.speedMps,
          headingDegrees: latestLocation.headingDegrees,
          recordedAt: latestLocation.recordedAt,
          receivedAt: latestLocation.receivedAt,
          stale: Date.now() - new Date(latestLocation.receivedAt).getTime() > 2 * 60 * 1000,
        }
      : null,
    timeline,
    lastUpdatedAt: latestLocation?.receivedAt ?? assignment.updatedAt,
  };
}

export async function buildPublicTrackingResponse(
  token: string,
  options?: {
    repositories?: CourierRepositories;
  },
): Promise<PublicTrackingResponse> {
  const tracking = await getPublicTrackingViewByToken(token, options);
  return { tracking };
}

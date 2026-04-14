import {
  isTerminalAssignmentStatus,
  type Courier,
  type CourierDeviceSession,
  type CourierLocationPing,
  type DeliveryAssignment,
  type DeliveryStatusEvent,
  type DeliveryTrackingSession,
  type PublicTrackingTokenRecord,
} from "@/lib/courier/types";
import type {
  AssignmentListFilter,
  AssignmentRepository,
} from "./assignment-repository";
import type { CourierListFilter, CourierRepository } from "./courier-repository";
import type {
  DeliveryStatusEventListFilter,
  EventRepository,
} from "./event-repository";
import type {
  TrackingPingListFilter,
  TrackingRepository,
  TrackingSessionListFilter,
} from "./tracking-repository";
import type { TrackingTokenRepository } from "./tracking-token-repository";

export type CourierStoreState = {
  couriers: Map<string, Courier>;
  courierSessions: Map<string, CourierDeviceSession>;
  assignments: Map<string, DeliveryAssignment>;
  trackingSessions: Map<string, DeliveryTrackingSession>;
  trackingTokens: Map<string, PublicTrackingTokenRecord>;
  locationPings: CourierLocationPing[];
  events: DeliveryStatusEvent[];
};

export type CourierMutationRunner = <T>(
  mutate: () => T | Promise<T>,
) => Promise<T>;

async function runWithoutPersistence<T>(mutate: () => T | Promise<T>) {
  return await mutate();
}

function byUpdatedAtDesc<
  T extends { updatedAt?: string; receivedAt?: string; occurredAt?: string },
>(left: T, right: T) {
  const leftValue = left.updatedAt ?? left.receivedAt ?? left.occurredAt ?? "";
  const rightValue = right.updatedAt ?? right.receivedAt ?? right.occurredAt ?? "";
  return rightValue.localeCompare(leftValue);
}

function matchesCourierFilter(courier: Courier, filter?: CourierListFilter) {
  if (!filter) {
    return true;
  }

  if (filter.includeInactive !== true && !courier.isActive) {
    return false;
  }

  if (filter.statuses && filter.statuses.length > 0 && !filter.statuses.includes(courier.status)) {
    return false;
  }

  return true;
}

function matchesAssignmentFilter(
  assignment: DeliveryAssignment,
  filter?: AssignmentListFilter,
) {
  if (!filter) {
    return true;
  }

  if (filter.courierId && assignment.courierId !== filter.courierId) {
    return false;
  }

  if (filter.orderId && assignment.orderId !== filter.orderId) {
    return false;
  }

  if (filter.statuses && filter.statuses.length > 0 && !filter.statuses.includes(assignment.status)) {
    return false;
  }

  if (filter.onlyActive && isTerminalAssignmentStatus(assignment.status)) {
    return false;
  }

  return true;
}

function matchesTrackingSessionFilter(
  session: DeliveryTrackingSession,
  filter?: TrackingSessionListFilter,
) {
  if (!filter) {
    return true;
  }

  if (filter.courierId && session.courierId !== filter.courierId) {
    return false;
  }

  if (filter.assignmentId && session.assignmentId !== filter.assignmentId) {
    return false;
  }

  if (filter.onlyActive && session.endedAt !== null) {
    return false;
  }

  return true;
}

function matchesTrackingPingFilter(
  ping: CourierLocationPing,
  filter?: TrackingPingListFilter,
) {
  if (!filter) {
    return true;
  }

  if (filter.courierId && ping.courierId !== filter.courierId) {
    return false;
  }

  if (filter.assignmentId && ping.assignmentId !== filter.assignmentId) {
    return false;
  }

  if (filter.since && ping.receivedAt < filter.since) {
    return false;
  }

  return true;
}

function matchesEventFilter(
  event: DeliveryStatusEvent,
  filter?: DeliveryStatusEventListFilter,
) {
  if (!filter) {
    return true;
  }

  if (filter.assignmentId && event.assignmentId !== filter.assignmentId) {
    return false;
  }

  if (filter.orderId && event.orderId !== filter.orderId) {
    return false;
  }

  if (filter.courierId && event.courierId !== filter.courierId) {
    return false;
  }

  if (filter.eventTypes && filter.eventTypes.length > 0 && !filter.eventTypes.includes(event.eventType)) {
    return false;
  }

  return true;
}

function createCourierRepository(
  store: CourierStoreState,
  runMutation: CourierMutationRunner,
): CourierRepository {
  return {
    async getById(id) {
      return store.couriers.get(id) ?? null;
    },

    async getByPhone(phone) {
      return (
        Array.from(store.couriers.values()).find((courier) => courier.phone === phone) ?? null
      );
    },

    async list(filter) {
      return Array.from(store.couriers.values())
        .filter((courier) => matchesCourierFilter(courier, filter))
        .sort(byUpdatedAtDesc);
    },

    async upsert(courier) {
      return runMutation(async () => {
        store.couriers.set(courier.id, courier);
        return courier;
      });
    },

    async getSessionById(sessionId) {
      return store.courierSessions.get(sessionId) ?? null;
    },

    async getActiveSessionByCourierId(courierId) {
      return (
        Array.from(store.courierSessions.values())
          .filter((session) => session.courierId === courierId && session.sessionEndedAt === null)
          .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))[0] ?? null
      );
    },

    async listSessionsByCourierId(courierId) {
      return Array.from(store.courierSessions.values())
        .filter((session) => session.courierId === courierId)
        .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
    },

    async upsertSession(session) {
      return runMutation(async () => {
        store.courierSessions.set(session.id, session);
        return session;
      });
    },
  };
}

function createAssignmentRepository(
  store: CourierStoreState,
  runMutation: CourierMutationRunner,
): AssignmentRepository {
  return {
    async getById(id) {
      return store.assignments.get(id) ?? null;
    },

    async list(filter) {
      return Array.from(store.assignments.values())
        .filter((assignment) => matchesAssignmentFilter(assignment, filter))
        .sort(byUpdatedAtDesc);
    },

    async upsert(assignment) {
      return runMutation(async () => {
        store.assignments.set(assignment.id, assignment);
        return assignment;
      });
    },
  };
}

function createTrackingRepository(
  store: CourierStoreState,
  runMutation: CourierMutationRunner,
): TrackingRepository {
  return {
    async getSessionById(id) {
      return store.trackingSessions.get(id) ?? null;
    },

    async getActiveSessionByAssignmentId(assignmentId) {
      return (
        Array.from(store.trackingSessions.values())
          .filter((session) => session.assignmentId === assignmentId && session.endedAt === null)
          .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0] ?? null
      );
    },

    async listSessions(filter) {
      return Array.from(store.trackingSessions.values())
        .filter((session) => matchesTrackingSessionFilter(session, filter))
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
    },

    async upsertSession(session) {
      return runMutation(async () => {
        store.trackingSessions.set(session.id, session);
        return session;
      });
    },

    async appendLocationPing(ping) {
      return runMutation(async () => {
        store.locationPings.push(ping);
        store.locationPings.sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
        return ping;
      });
    },

    async listLocationPings(filter) {
      const items = store.locationPings.filter((ping) => matchesTrackingPingFilter(ping, filter));
      return typeof filter?.limit === "number" ? items.slice(0, filter.limit) : items;
    },

    async getLatestLocationPing(input) {
      return (
        store.locationPings.find((ping) => {
          if (input.assignmentId && ping.assignmentId !== input.assignmentId) {
            return false;
          }

          if (input.courierId && ping.courierId !== input.courierId) {
            return false;
          }

          return true;
        }) ?? null
      );
    },
  };
}

function createEventRepository(
  store: CourierStoreState,
  runMutation: CourierMutationRunner,
): EventRepository {
  return {
    async append(event) {
      return runMutation(async () => {
        store.events.push(event);
        store.events.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
        return event;
      });
    },

    async list(filter) {
      const items = store.events.filter((event) => matchesEventFilter(event, filter));
      return typeof filter?.limit === "number" ? items.slice(0, filter.limit) : items;
    },
  };
}

function createTrackingTokenRepository(
  store: CourierStoreState,
  runMutation: CourierMutationRunner,
): TrackingTokenRepository {
  return {
    async getByToken(token) {
      return store.trackingTokens.get(token) ?? null;
    },

    async listByAssignmentId(assignmentId) {
      return Array.from(store.trackingTokens.values())
        .filter((tokenRecord) => tokenRecord.assignmentId === assignmentId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },

    async upsert(tokenRecord) {
      return runMutation(async () => {
        store.trackingTokens.set(tokenRecord.token, tokenRecord);
        return tokenRecord;
      });
    },

    async revoke(token, revokedAt) {
      return runMutation(async () => {
        const current = store.trackingTokens.get(token);

        if (!current) {
          return null;
        }

        const next = {
          ...current,
          revokedAt,
        };
        store.trackingTokens.set(token, next);
        return next;
      });
    },
  };
}

export function createCourierRepositoriesFromStore(
  store: CourierStoreState,
  runMutation: CourierMutationRunner = runWithoutPersistence,
) {
  return {
    couriers: createCourierRepository(store, runMutation),
    assignments: createAssignmentRepository(store, runMutation),
    tracking: createTrackingRepository(store, runMutation),
    events: createEventRepository(store, runMutation),
    trackingTokens: createTrackingTokenRepository(store, runMutation),
  };
}

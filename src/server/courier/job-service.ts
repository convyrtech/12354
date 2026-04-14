import type {
  AssignmentStatus,
  CourierAssignmentActionRequest,
  CourierAssignmentActionType,
  DeliveryAssignment,
} from "@/lib/courier/types";
import {
  CourierConflictError,
  CourierNotFoundError,
  CourierTransitionError,
  CourierValidationError,
} from "./errors";
import { appendDeliveryStatusEvent, listAssignmentEvents } from "./event-service";
import { getCourierRepositories } from "./repositories/runtime";
import type { CourierRepositories } from "./types";
import { nowIso } from "./utils";

type TransitionRule = {
  from: AssignmentStatus[];
  to: AssignmentStatus;
  eventType:
    | "assignment_accepted"
    | "courier_arrived_pickup"
    | "order_picked_up"
    | "courier_arrived_dropoff"
    | "order_delivered"
    | "delivery_failed";
  statusNote: string;
};

const transitionRules: Record<CourierAssignmentActionType, TransitionRule> = {
  accept: {
    from: ["assigned"],
    to: "accepted",
    eventType: "assignment_accepted",
    statusNote: "Курьер принял заказ.",
  },
  arrive_pickup: {
    from: ["accepted", "en_route_to_pickup"],
    to: "waiting_at_pickup",
    eventType: "courier_arrived_pickup",
    statusNote: "Курьер прибыл к точке выдачи.",
  },
  picked_up: {
    from: ["accepted", "waiting_at_pickup", "picked_up"],
    to: "picked_up",
    eventType: "order_picked_up",
    statusNote: "Заказ у курьера.",
  },
  arrive_dropoff: {
    from: ["picked_up", "en_route_to_customer", "arrived_near_customer"],
    to: "arrived_near_customer",
    eventType: "courier_arrived_dropoff",
    statusNote: "Курьер прибыл к клиенту.",
  },
  delivered: {
    from: ["picked_up", "arrived_near_customer"],
    to: "delivered",
    eventType: "order_delivered",
    statusNote: "Заказ доставлен.",
  },
  fail: {
    from: ["assigned", "accepted", "waiting_at_pickup", "picked_up", "arrived_near_customer"],
    to: "failed",
    eventType: "delivery_failed",
    statusNote: "Доставка завершилась с проблемой.",
  },
};

function applyTimestampFields(
  assignment: DeliveryAssignment,
  action: CourierAssignmentActionType,
  timestamp: string,
  failureReason: string | null,
) {
  switch (action) {
    case "accept":
      return {
        ...assignment,
        acceptedAt: assignment.acceptedAt ?? timestamp,
      };
    case "picked_up":
      return {
        ...assignment,
        pickedUpAt: assignment.pickedUpAt ?? timestamp,
      };
    case "arrive_dropoff":
      return {
        ...assignment,
        arrivedAtDropoffAt: assignment.arrivedAtDropoffAt ?? timestamp,
      };
    case "delivered":
      return {
        ...assignment,
        deliveredAt: assignment.deliveredAt ?? timestamp,
      };
    case "fail":
      return {
        ...assignment,
        failedAt: assignment.failedAt ?? timestamp,
        cancellationReason: failureReason,
      };
    default:
      return assignment;
  }
}

function resolveStatusNote(
  action: CourierAssignmentActionType,
  input: CourierAssignmentActionRequest,
  fallback: string,
) {
  if (action === "fail") {
    return input.failureReason?.trim() || input.note?.trim() || fallback;
  }

  return input.note?.trim() || fallback;
}

async function getCourierOwnedAssignment(
  assignmentId: string,
  courierId: string,
  repositories: CourierRepositories,
) {
  const assignment = await repositories.assignments.getById(assignmentId);

  if (!assignment) {
    throw new CourierNotFoundError("Assignment was not found.");
  }

  if (assignment.courierId !== courierId) {
    throw new CourierConflictError("Assignment belongs to another courier.");
  }

  return assignment;
}

export async function listCourierActiveJobs(
  courierId: string,
  options?: {
    repositories?: CourierRepositories;
  },
) {
  const repositories = options?.repositories ?? (await getCourierRepositories());
  return repositories.assignments.list({
    courierId,
    onlyActive: true,
  });
}

export async function getCourierJobDetail(
  courierId: string,
  assignmentId: string,
  options?: {
    repositories?: CourierRepositories;
  },
) {
  const repositories = options?.repositories ?? (await getCourierRepositories());
  const assignment = await getCourierOwnedAssignment(
    assignmentId,
    courierId,
    repositories,
  );
  const timeline = await listAssignmentEvents(assignment.id, { repositories, limit: 50 });

  return {
    assignment,
    timeline,
  };
}

export async function applyCourierAssignmentAction(
  courierId: string,
  assignmentId: string,
  action: CourierAssignmentActionType,
  input: CourierAssignmentActionRequest,
  options?: {
    repositories?: CourierRepositories;
  },
) {
  if (!assignmentId.trim()) {
    throw new CourierValidationError("Assignment ID is required.");
  }

  const repositories = options?.repositories ?? (await getCourierRepositories());
  const assignment = await getCourierOwnedAssignment(
    assignmentId.trim(),
    courierId,
    repositories,
  );
  const rule = transitionRules[action];

  if (assignment.status === rule.to) {
    return assignment;
  }

  if (!rule.from.includes(assignment.status)) {
    throw new CourierTransitionError(
      `Assignment cannot transition via "${action}" from status "${assignment.status}".`,
    );
  }

  const timestamp = nowIso();
  const failureReason = input.failureReason?.trim() || null;
  const statusNote = resolveStatusNote(action, input, rule.statusNote);

  const nextBase = applyTimestampFields(assignment, action, timestamp, failureReason);
  const nextAssignment: DeliveryAssignment = {
    ...nextBase,
    status: rule.to,
    statusNote,
    updatedAt: timestamp,
  };

  await repositories.assignments.upsert(nextAssignment);

  const courier = await repositories.couriers.getById(courierId);

  if (!courier) {
    throw new CourierNotFoundError("Courier was not found.");
  }

  const nextCourierStatus =
    action === "accept"
      ? "busy"
      : action === "delivered" || action === "fail"
        ? "available"
        : courier.status;

  if (nextCourierStatus !== courier.status) {
    await repositories.couriers.upsert({
      ...courier,
      status: nextCourierStatus,
      updatedAt: timestamp,
    });
  }

  await appendDeliveryStatusEvent(
    {
      assignmentId: nextAssignment.id,
      orderId: nextAssignment.orderId,
      courierId,
      eventType: rule.eventType,
      eventPayload:
        action === "fail" && failureReason
          ? { failureReason, statusNote }
          : { statusNote },
      occurredAt: timestamp,
    },
    { repositories },
  );

  return nextAssignment;
}

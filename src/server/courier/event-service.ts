import type {
  DeliveryEventType,
  DeliveryStatusEvent,
} from "@/lib/courier/types";
import { createCourierEntityId, nowIso } from "./utils";
import { getCourierRepositories } from "./repositories/runtime";
import type { CourierRepositories } from "./types";

export type AppendDeliveryStatusEventInput = {
  assignmentId: string;
  orderId: string;
  courierId: string | null;
  eventType: DeliveryEventType;
  eventPayload?: Record<string, unknown>;
  occurredAt?: string;
};

export async function appendDeliveryStatusEvent(
  input: AppendDeliveryStatusEventInput,
  options?: {
    repositories?: CourierRepositories;
  },
): Promise<DeliveryStatusEvent> {
  const repositories = options?.repositories ?? (await getCourierRepositories());
  const timestamp = input.occurredAt ?? nowIso();

  return repositories.events.append({
    id: createCourierEntityId("delivery_event"),
    assignmentId: input.assignmentId,
    orderId: input.orderId,
    courierId: input.courierId,
    eventType: input.eventType,
    eventPayload: input.eventPayload ?? {},
    occurredAt: timestamp,
    createdAt: timestamp,
  });
}

export async function listAssignmentEvents(
  assignmentId: string,
  options?: {
    repositories?: CourierRepositories;
    limit?: number;
  },
) {
  const repositories = options?.repositories ?? (await getCourierRepositories());

  return repositories.events.list({
    assignmentId,
    limit: options?.limit,
  });
}

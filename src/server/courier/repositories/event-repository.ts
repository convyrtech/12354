import type {
  DeliveryEventType,
  DeliveryStatusEvent,
} from "@/lib/courier/types";

export type DeliveryStatusEventListFilter = {
  assignmentId?: string;
  orderId?: string;
  courierId?: string;
  eventTypes?: DeliveryEventType[];
  limit?: number;
};

export interface EventRepository {
  append(event: DeliveryStatusEvent): Promise<DeliveryStatusEvent>;
  list(filter?: DeliveryStatusEventListFilter): Promise<DeliveryStatusEvent[]>;
}

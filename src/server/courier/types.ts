export type * from "@/lib/courier/types";
export type {
  AssignmentListFilter,
  AssignmentRepository,
  CourierListFilter,
  CourierRepository,
  DeliveryStatusEventListFilter,
  EventRepository,
  TrackingPingListFilter,
  TrackingRepository,
  TrackingSessionListFilter,
  TrackingTokenRepository,
} from "./repositories";

import type {
  AssignmentRepository,
  CourierRepository,
  EventRepository,
  TrackingRepository,
  TrackingTokenRepository,
} from "./repositories";

export type CourierRepositories = {
  couriers: CourierRepository;
  assignments: AssignmentRepository;
  tracking: TrackingRepository;
  events: EventRepository;
  trackingTokens: TrackingTokenRepository;
};

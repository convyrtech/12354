export const courierStatuses = ["offline", "available", "busy", "paused"] as const;
export type CourierStatus = (typeof courierStatuses)[number];

export const courierPlatforms = ["ios", "android", "web"] as const;
export type CourierPlatform = (typeof courierPlatforms)[number];

export const courierVehicleTypes = ["foot", "bike", "scooter", "car"] as const;
export type CourierVehicleType = (typeof courierVehicleTypes)[number];

export const assignmentStatuses = [
  "pending_assignment",
  "assigned",
  "accepted",
  "en_route_to_pickup",
  "waiting_at_pickup",
  "picked_up",
  "en_route_to_customer",
  "arrived_near_customer",
  "delivered",
  "failed",
  "cancelled",
] as const;
export type AssignmentStatus = (typeof assignmentStatuses)[number];

export const assignmentTerminalStatuses = ["delivered", "failed", "cancelled"] as const;

export const trackingModes = ["active_delivery", "manual_live_share"] as const;
export type TrackingMode = (typeof trackingModes)[number];

export const trackingProviderNames = ["direct_mobile", "traccar", "manual"] as const;
export type TrackingProviderName = (typeof trackingProviderNames)[number];

export const locationPingSources = ["courier_app", "traccar", "manual"] as const;
export type LocationPingSource = (typeof locationPingSources)[number];

export const deliveryEventTypes = [
  "assignment_created",
  "courier_assigned",
  "assignment_accepted",
  "courier_location_updated",
  "courier_arrived_pickup",
  "order_picked_up",
  "courier_arrived_dropoff",
  "order_delivered",
  "delivery_failed",
  "assignment_cancelled",
] as const;
export type DeliveryEventType = (typeof deliveryEventTypes)[number];

export const courierApiErrorCodes = [
  "invalid_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "unsupported_transition",
  "tracking_token_invalid",
  "tracking_token_expired",
  "unavailable",
] as const;
export type CourierApiErrorCode = (typeof courierApiErrorCodes)[number];

export type Courier = {
  id: string;
  displayName: string;
  phone: string;
  status: CourierStatus;
  vehicleType: CourierVehicleType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CourierDeviceSession = {
  id: string;
  courierId: string;
  deviceId: string;
  platform: CourierPlatform;
  appVersion: string | null;
  pushToken: string | null;
  sessionStartedAt: string;
  sessionEndedAt: string | null;
  lastSeenAt: string;
};

export type DeliveryAssignment = {
  id: string;
  orderId: string;
  orderLabel: string;
  courierId: string | null;
  kitchenId: string | null;
  kitchenLabel: string | null;
  customerLabel: string | null;
  dropoffAddressLabel: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  status: AssignmentStatus;
  statusNote: string;
  assignedAt: string | null;
  acceptedAt: string | null;
  pickupStartedAt: string | null;
  pickedUpAt: string | null;
  arrivedAtDropoffAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryTrackingSession = {
  id: string;
  assignmentId: string;
  courierId: string | null;
  trackingMode: TrackingMode;
  provider: TrackingProviderName;
  startedAt: string;
  endedAt: string | null;
  publicTrackingToken: string | null;
  publicTrackingExpiresAt: string | null;
  lastLocationAt: string | null;
};

export type CourierLocationPing = {
  id: string;
  courierId: string;
  assignmentId: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  speedMps: number | null;
  headingDegrees: number | null;
  batteryLevelPercent: number | null;
  source: LocationPingSource;
  recordedAt: string;
  receivedAt: string;
};

export type CourierLocationSnapshot = {
  courierId: string;
  assignmentId: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  speedMps: number | null;
  headingDegrees: number | null;
  recordedAt: string;
  receivedAt: string;
  stale: boolean;
};

export type DeliveryStatusEvent = {
  id: string;
  assignmentId: string;
  orderId: string;
  courierId: string | null;
  eventType: DeliveryEventType;
  eventPayload: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

export type PublicTrackingTokenRecord = {
  token: string;
  assignmentId: string;
  orderId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type PublicTrackingView = {
  token: string;
  orderId: string;
  orderLabel: string;
  assignmentStatus: AssignmentStatus;
  courier: {
    id: string | null;
    displayName: string | null;
    vehicleType: CourierVehicleType | null;
  };
  destination: {
    label: string;
    lat: number | null;
    lng: number | null;
  };
  etaLabel: string | null;
  liveLocation: CourierLocationSnapshot | null;
  timeline: DeliveryStatusEvent[];
  lastUpdatedAt: string | null;
};

export type CourierApiError = {
  code: CourierApiErrorCode;
  message: string;
};

export type CourierAuthLoginRequest = {
  phone: string;
  platform: CourierPlatform;
  deviceId: string;
  code?: string | null;
  appVersion?: string | null;
  pushToken?: string | null;
};

export type CourierAuthLoginResponse = {
  courier: Courier | null;
  session: CourierDeviceSession | null;
  error?: CourierApiError;
};

export type CourierAuthLogoutResponse = {
  loggedOut: boolean;
  error?: CourierApiError;
};

export type CourierMeResponse = {
  courier: Courier | null;
  session: CourierDeviceSession | null;
  error?: CourierApiError;
};

export type CourierActiveJobsResponse = {
  items: DeliveryAssignment[];
  error?: CourierApiError;
};

export type CourierJobDetailResponse = {
  assignment: DeliveryAssignment | null;
  timeline: DeliveryStatusEvent[];
  error?: CourierApiError;
};

export const courierAssignmentActionTypes = [
  "accept",
  "arrive_pickup",
  "picked_up",
  "arrive_dropoff",
  "delivered",
  "fail",
] as const;
export type CourierAssignmentActionType =
  (typeof courierAssignmentActionTypes)[number];

export type CourierAssignmentActionRequest = {
  note?: string | null;
  failureReason?: string | null;
};

export type CourierAssignmentActionResponse = {
  assignment: DeliveryAssignment | null;
  error?: CourierApiError;
};

export type CourierLocationWriteRequest = {
  assignmentId?: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  speedMps?: number | null;
  headingDegrees?: number | null;
  batteryLevelPercent?: number | null;
  recordedAt?: string | null;
};

export type CourierLocationWriteResponse = {
  accepted: boolean;
  receivedAt: string;
  error?: CourierApiError;
};

export type AssignmentTrackResponse = {
  assignmentId: string;
  session: DeliveryTrackingSession | null;
  latestLocation: CourierLocationSnapshot | null;
  recentLocations: CourierLocationPing[];
  error?: CourierApiError;
};

export type AdminDispatchOverviewResponse = {
  couriers: Courier[];
  assignments: DeliveryAssignment[];
  latestLocations: CourierLocationSnapshot[];
  error?: CourierApiError;
};

export type AdminDispatchCourierListResponse = {
  items: Courier[];
  error?: CourierApiError;
};

export type AdminDispatchActiveAssignmentsResponse = {
  items: DeliveryAssignment[];
  error?: CourierApiError;
};

export type AdminCreateAssignmentRequest = {
  orderId: string;
  orderLabel: string;
  courierId?: string | null;
  kitchenId?: string | null;
  kitchenLabel?: string | null;
  customerLabel?: string | null;
  dropoffAddressLabel: string;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  statusNote?: string | null;
};

export type AdminCreateAssignmentResponse = {
  assignment: DeliveryAssignment | null;
  error?: CourierApiError;
};

export type AdminAssignCourierRequest = {
  courierId: string;
  statusNote?: string | null;
};

export type AdminAssignCourierResponse = {
  assignment: DeliveryAssignment | null;
  error?: CourierApiError;
};

export type AdminAssignmentTrackingTokenResponse = {
  tokenRecord: PublicTrackingTokenRecord | null;
  error?: CourierApiError;
};

export type PublicTrackingResponse = {
  tracking: PublicTrackingView | null;
  error?: CourierApiError;
};

export function isTerminalAssignmentStatus(status: AssignmentStatus) {
  return assignmentTerminalStatuses.includes(
    status as (typeof assignmentTerminalStatuses)[number],
  );
}

export function isLiveAssignmentStatus(status: AssignmentStatus) {
  return !isTerminalAssignmentStatus(status);
}

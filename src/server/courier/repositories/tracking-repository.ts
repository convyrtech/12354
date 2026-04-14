import type {
  CourierLocationPing,
  DeliveryTrackingSession,
} from "@/lib/courier/types";

export type TrackingSessionListFilter = {
  courierId?: string;
  assignmentId?: string;
  onlyActive?: boolean;
};

export type TrackingPingListFilter = {
  courierId?: string;
  assignmentId?: string;
  since?: string;
  limit?: number;
};

export interface TrackingRepository {
  getSessionById(id: string): Promise<DeliveryTrackingSession | null>;
  getActiveSessionByAssignmentId(assignmentId: string): Promise<DeliveryTrackingSession | null>;
  listSessions(filter?: TrackingSessionListFilter): Promise<DeliveryTrackingSession[]>;
  upsertSession(session: DeliveryTrackingSession): Promise<DeliveryTrackingSession>;
  appendLocationPing(ping: CourierLocationPing): Promise<CourierLocationPing>;
  listLocationPings(filter?: TrackingPingListFilter): Promise<CourierLocationPing[]>;
  getLatestLocationPing(input: {
    courierId?: string;
    assignmentId?: string;
  }): Promise<CourierLocationPing | null>;
}

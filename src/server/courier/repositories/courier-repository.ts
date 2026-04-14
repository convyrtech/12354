import type {
  Courier,
  CourierDeviceSession,
  CourierStatus,
} from "@/lib/courier/types";

export type CourierListFilter = {
  statuses?: CourierStatus[];
  includeInactive?: boolean;
};

export interface CourierRepository {
  getById(id: string): Promise<Courier | null>;
  getByPhone(phone: string): Promise<Courier | null>;
  list(filter?: CourierListFilter): Promise<Courier[]>;
  upsert(courier: Courier): Promise<Courier>;
  getSessionById(sessionId: string): Promise<CourierDeviceSession | null>;
  getActiveSessionByCourierId(courierId: string): Promise<CourierDeviceSession | null>;
  listSessionsByCourierId(courierId: string): Promise<CourierDeviceSession[]>;
  upsertSession(session: CourierDeviceSession): Promise<CourierDeviceSession>;
}

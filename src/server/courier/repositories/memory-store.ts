import type {
  Courier,
  CourierDeviceSession,
  CourierLocationPing,
  DeliveryAssignment,
  DeliveryStatusEvent,
  DeliveryTrackingSession,
  PublicTrackingTokenRecord,
} from "@/lib/courier/types";
import {
  createCourierRepositoriesFromStore,
  type CourierStoreState,
} from "./repository-factory";

function getGlobalStore() {
  const root = globalThis as typeof globalThis & {
    __rakiCourierMemoryStore?: CourierStoreState;
  };

  if (!root.__rakiCourierMemoryStore) {
    root.__rakiCourierMemoryStore = {
      couriers: new Map<string, Courier>(),
      courierSessions: new Map<string, CourierDeviceSession>(),
      assignments: new Map<string, DeliveryAssignment>(),
      trackingSessions: new Map<string, DeliveryTrackingSession>(),
      trackingTokens: new Map<string, PublicTrackingTokenRecord>(),
      locationPings: [],
      events: [],
    };
  }

  return root.__rakiCourierMemoryStore;
}
export function createMemoryCourierRepositories() {
  const store = getGlobalStore();
  return createCourierRepositoriesFromStore(store);
}

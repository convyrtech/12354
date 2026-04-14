import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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

const COURIER_DATA_DIR = path.join(process.cwd(), "data", "courier");
const COURIER_STATE_FILE = path.join(COURIER_DATA_DIR, "state.json");
const COURIER_STATE_VERSION = 1;

type PersistedCourierState = {
  version: number;
  updatedAt: string;
  couriers: Courier[];
  courierSessions: CourierDeviceSession[];
  assignments: DeliveryAssignment[];
  trackingSessions: DeliveryTrackingSession[];
  trackingTokens: PublicTrackingTokenRecord[];
  locationPings: CourierLocationPing[];
  events: DeliveryStatusEvent[];
};

type FileCourierRepositories = ReturnType<typeof createCourierRepositoriesFromStore>;

type CourierFileStoreRuntime = {
  repositories?: FileCourierRepositories;
  initPromise?: Promise<FileCourierRepositories>;
  mutationQueue: Promise<void>;
};

function getDefaultState(): PersistedCourierState {
  return {
    version: COURIER_STATE_VERSION,
    updatedAt: new Date(0).toISOString(),
    couriers: [],
    courierSessions: [],
    assignments: [],
    trackingSessions: [],
    trackingTokens: [],
    locationPings: [],
    events: [],
  };
}

function createStoreFromState(state: PersistedCourierState): CourierStoreState {
  return {
    couriers: new Map(state.couriers.map((item) => [item.id, item])),
    courierSessions: new Map(state.courierSessions.map((item) => [item.id, item])),
    assignments: new Map(state.assignments.map((item) => [item.id, item])),
    trackingSessions: new Map(state.trackingSessions.map((item) => [item.id, item])),
    trackingTokens: new Map(state.trackingTokens.map((item) => [item.token, item])),
    locationPings: [...state.locationPings],
    events: [...state.events],
  };
}

function createStateFromStore(store: CourierStoreState): PersistedCourierState {
  return {
    version: COURIER_STATE_VERSION,
    updatedAt: new Date().toISOString(),
    couriers: Array.from(store.couriers.values()),
    courierSessions: Array.from(store.courierSessions.values()),
    assignments: Array.from(store.assignments.values()),
    trackingSessions: Array.from(store.trackingSessions.values()),
    trackingTokens: Array.from(store.trackingTokens.values()),
    locationPings: [...store.locationPings],
    events: [...store.events],
  };
}

function cloneStore(store: CourierStoreState): CourierStoreState {
  return {
    couriers: new Map(store.couriers),
    courierSessions: new Map(store.courierSessions),
    assignments: new Map(store.assignments),
    trackingSessions: new Map(store.trackingSessions),
    trackingTokens: new Map(store.trackingTokens),
    locationPings: [...store.locationPings],
    events: [...store.events],
  };
}

function restoreStore(store: CourierStoreState, snapshot: CourierStoreState) {
  store.couriers = new Map(snapshot.couriers);
  store.courierSessions = new Map(snapshot.courierSessions);
  store.assignments = new Map(snapshot.assignments);
  store.trackingSessions = new Map(snapshot.trackingSessions);
  store.trackingTokens = new Map(snapshot.trackingTokens);
  store.locationPings = [...snapshot.locationPings];
  store.events = [...snapshot.events];
}

async function ensureCourierDataDir() {
  await mkdir(COURIER_DATA_DIR, { recursive: true });
}

async function readPersistedState() {
  try {
    const raw = await readFile(COURIER_STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedCourierState>;
    return {
      ...getDefaultState(),
      ...parsed,
      couriers: Array.isArray(parsed.couriers) ? parsed.couriers : [],
      courierSessions: Array.isArray(parsed.courierSessions) ? parsed.courierSessions : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      trackingSessions: Array.isArray(parsed.trackingSessions) ? parsed.trackingSessions : [],
      trackingTokens: Array.isArray(parsed.trackingTokens) ? parsed.trackingTokens : [],
      locationPings: Array.isArray(parsed.locationPings) ? parsed.locationPings : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    } satisfies PersistedCourierState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return getDefaultState();
    }

    throw error;
  }
}

async function persistState(store: CourierStoreState) {
  await ensureCourierDataDir();
  const nextState = createStateFromStore(store);
  await writeFile(COURIER_STATE_FILE, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
}

function getRuntime() {
  const root = globalThis as typeof globalThis & {
    __rakiCourierFileStoreRuntime?: CourierFileStoreRuntime;
  };

  if (!root.__rakiCourierFileStoreRuntime) {
    root.__rakiCourierFileStoreRuntime = {
      mutationQueue: Promise.resolve(),
    };
  }

  return root.__rakiCourierFileStoreRuntime;
}

async function runSerializedMutation<T>(
  runtime: CourierFileStoreRuntime,
  store: CourierStoreState,
  mutate: () => T | Promise<T>,
) {
  let result: T | undefined;
  let hasError = false;
  let mutationError: unknown;

  runtime.mutationQueue = runtime.mutationQueue
    .catch(() => {})
    .then(async () => {
      const snapshot = cloneStore(store);

      try {
        result = await mutate();
        await persistState(store);
      } catch (error) {
        restoreStore(store, snapshot);
        hasError = true;
        mutationError = error;
        throw error;
      }
    });

  await runtime.mutationQueue;

  if (hasError) {
    throw mutationError;
  }

  return result as T;
}

export async function createFileCourierRepositories() {
  const runtime = getRuntime();

  if (runtime.repositories) {
    return runtime.repositories;
  }

  if (!runtime.initPromise) {
    runtime.initPromise = (async () => {
      await ensureCourierDataDir();
      const state = await readPersistedState();
      const store = createStoreFromState(state);

      const repositories = createCourierRepositoriesFromStore(store, (mutate) =>
        runSerializedMutation(runtime, store, mutate),
      );

      runtime.repositories = repositories;
      return repositories;
    })().catch((error) => {
      runtime.initPromise = undefined;
      throw error;
    });
  }

  return runtime.initPromise;
}

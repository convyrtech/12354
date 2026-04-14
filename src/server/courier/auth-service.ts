import type {
  Courier,
  CourierAuthLoginRequest,
  CourierDeviceSession,
} from "@/lib/courier/types";
import {
  CourierAuthError,
  CourierNotFoundError,
  CourierValidationError,
} from "./errors";
import { getCourierRepositories } from "./repositories/runtime";
import type { CourierRepositories } from "./types";
import { createCourierEntityId, nowIso } from "./utils";

export const COURIER_SESSION_COOKIE_NAME = "raki_courier_session";
const COURIER_SESSION_TTL_SECONDS = 60 * 60 * 12;

export type CourierAuthContext = {
  courier: Courier;
  session: CourierDeviceSession;
};

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function getCourierSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COURIER_SESSION_TTL_SECONDS,
  };
}

function validateLoginInput(input: CourierAuthLoginRequest) {
  if (!input.phone.trim()) {
    throw new CourierValidationError("Phone is required.");
  }

  if (!input.deviceId.trim()) {
    throw new CourierValidationError("Device ID is required.");
  }
}

async function findCourierByPhone(
  phone: string,
  repositories: CourierRepositories,
) {
  const normalized = normalizePhone(phone);
  const items = await repositories.couriers.list({ includeInactive: true });

  return (
    items.find((courier) => normalizePhone(courier.phone) === normalized) ?? null
  );
}

export async function loginCourier(
  input: CourierAuthLoginRequest,
  options?: {
    repositories?: CourierRepositories;
  },
) {
  validateLoginInput(input);

  const repositories = options?.repositories ?? (await getCourierRepositories());
  const courier = await findCourierByPhone(input.phone, repositories);

  if (!courier || !courier.isActive) {
    throw new CourierNotFoundError("Courier account was not found.");
  }

  const now = nowIso();
  const currentSession = await repositories.couriers.getActiveSessionByCourierId(courier.id);
  const sessionId = currentSession?.id ?? createCourierEntityId("courier_session");

  const nextCourier =
    courier.status === "offline"
      ? {
          ...courier,
          status: "available" as const,
          updatedAt: now,
        }
      : courier;

  const session: CourierDeviceSession = {
    id: sessionId,
    courierId: courier.id,
    deviceId: input.deviceId.trim(),
    platform: input.platform,
    appVersion: input.appVersion?.trim() || null,
    pushToken: input.pushToken?.trim() || null,
    sessionStartedAt: currentSession?.sessionStartedAt ?? now,
    sessionEndedAt: null,
    lastSeenAt: now,
  };

  await repositories.couriers.upsert(nextCourier);
  await repositories.couriers.upsertSession(session);

  return {
    courier: nextCourier,
    session,
  };
}

export async function logoutCourierSession(
  sessionId: string,
  options?: {
    repositories?: CourierRepositories;
  },
) {
  const repositories = options?.repositories ?? (await getCourierRepositories());
  const session = await repositories.couriers.getSessionById(sessionId);

  if (!session || session.sessionEndedAt !== null) {
    return false;
  }

  const now = nowIso();
  await repositories.couriers.upsertSession({
    ...session,
    sessionEndedAt: now,
    lastSeenAt: now,
  });

  return true;
}

export async function requireCourierAuthContext(
  sessionId: string | null | undefined,
  options?: {
    repositories?: CourierRepositories;
  },
): Promise<CourierAuthContext> {
  if (!sessionId) {
    throw new CourierAuthError();
  }

  const repositories = options?.repositories ?? (await getCourierRepositories());
  const session = await repositories.couriers.getSessionById(sessionId);

  if (!session || session.sessionEndedAt !== null) {
    throw new CourierAuthError();
  }

  const courier = await repositories.couriers.getById(session.courierId);

  if (!courier || !courier.isActive) {
    throw new CourierAuthError();
  }

  const touchedSession = {
    ...session,
    lastSeenAt: nowIso(),
  };

  await repositories.couriers.upsertSession(touchedSession);

  return {
    courier,
    session: touchedSession,
  };
}

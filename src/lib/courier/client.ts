import type {
  AdminAssignCourierResponse,
  AdminAssignmentTrackingTokenResponse,
  AdminDispatchOverviewResponse,
  AssignmentTrackResponse,
  CourierActiveJobsResponse,
  CourierAssignmentActionRequest,
  CourierAssignmentActionResponse,
  CourierAuthLoginRequest,
  CourierAuthLoginResponse,
  CourierAuthLogoutResponse,
  CourierJobDetailResponse,
  CourierLocationWriteRequest,
  CourierLocationWriteResponse,
  CourierMeResponse,
  PublicTrackingResponse,
} from "@/lib/courier/types";

type FetchOptions = {
  signal?: AbortSignal;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Courier request failed.");
  }

  return payload;
}

export async function fetchAdminDispatchOverview(options: FetchOptions = {}) {
  const response = await fetch("/api/admin/dispatch/overview", {
    method: "GET",
    signal: options.signal,
    cache: "no-store",
  });

  return parseJsonResponse<AdminDispatchOverviewResponse>(response);
}

export async function fetchAssignmentTrack(
  assignmentId: string,
  options: FetchOptions = {},
) {
  const response = await fetch(`/api/internal/assignments/${assignmentId}/track`, {
    method: "GET",
    signal: options.signal,
    cache: "no-store",
  });

  return parseJsonResponse<AssignmentTrackResponse>(response);
}

export async function issueAssignmentTrackingToken(
  assignmentId: string,
  options: FetchOptions = {},
) {
  const response = await fetch(
    `/api/admin/dispatch/assignments/${assignmentId}/tracking-token`,
    {
      method: "POST",
      signal: options.signal,
      cache: "no-store",
    },
  );

  return parseJsonResponse<AdminAssignmentTrackingTokenResponse>(response);
}

export async function assignCourierToAssignment(
  assignmentId: string,
  input: {
    courierId: string;
    statusNote?: string | null;
  },
  options: FetchOptions = {},
) {
  const response = await fetch(
    `/api/admin/dispatch/assignments/${assignmentId}/assign`,
    {
      method: "POST",
      signal: options.signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseJsonResponse<AdminAssignCourierResponse>(response);
}

export async function fetchPublicTracking(
  token: string,
  options: FetchOptions = {},
) {
  const response = await fetch(`/api/public/track/${token}`, {
    method: "GET",
    signal: options.signal,
    cache: "no-store",
  });

  return parseJsonResponse<PublicTrackingResponse>(response);
}

export async function loginCourier(
  input: CourierAuthLoginRequest,
  options: FetchOptions = {},
) {
  const response = await fetch("/api/courier/auth/login", {
    method: "POST",
    signal: options.signal,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<CourierAuthLoginResponse>(response);
}

export async function logoutCourier(options: FetchOptions = {}) {
  const response = await fetch("/api/courier/auth/logout", {
    method: "POST",
    signal: options.signal,
    cache: "no-store",
  });

  return parseJsonResponse<CourierAuthLogoutResponse>(response);
}

export async function fetchCourierMe(options: FetchOptions = {}) {
  const response = await fetch("/api/courier/me", {
    method: "GET",
    signal: options.signal,
    cache: "no-store",
  });

  return parseJsonResponse<CourierMeResponse>(response);
}

export async function fetchCourierActiveJobs(options: FetchOptions = {}) {
  const response = await fetch("/api/courier/jobs/active", {
    method: "GET",
    signal: options.signal,
    cache: "no-store",
  });

  return parseJsonResponse<CourierActiveJobsResponse>(response);
}

export async function fetchCourierJobDetail(
  assignmentId: string,
  options: FetchOptions = {},
) {
  const response = await fetch(`/api/courier/jobs/${assignmentId}`, {
    method: "GET",
    signal: options.signal,
    cache: "no-store",
  });

  return parseJsonResponse<CourierJobDetailResponse>(response);
}

export async function performCourierAssignmentAction(
  assignmentId: string,
  action:
    | "accept"
    | "arrive-pickup"
    | "picked-up"
    | "arrive-dropoff"
    | "delivered"
    | "fail",
  input: CourierAssignmentActionRequest = {},
  options: FetchOptions = {},
) {
  const response = await fetch(`/api/courier/jobs/${assignmentId}/${action}`, {
    method: "POST",
    signal: options.signal,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<CourierAssignmentActionResponse>(response);
}

export async function writeCourierLocation(
  input: CourierLocationWriteRequest,
  options: FetchOptions = {},
) {
  const response = await fetch("/api/courier/location", {
    method: "POST",
    signal: options.signal,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<CourierLocationWriteResponse>(response);
}

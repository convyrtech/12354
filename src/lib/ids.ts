// Short, unprefixed opaque id. Falls back to a non-crypto random when
// `crypto.randomUUID` isn't available (old browsers, restricted runtimes) —
// callers using ids as idempotency keys / session tokens shouldn't rely on
// collision resistance anyway. A prefix (e.g. "quote_") is the caller's job.
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

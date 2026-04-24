import type { GeoProviderRequestOptions } from "@/server/geo/provider-types";

const DEFAULT_TIMEOUT_MS = 2500;

/**
 * Combine the caller's AbortSignal (if any) with a timeout signal so the
 * outbound fetch aborts on whichever fires first. Returns undefined when
 * there's nothing to combine.
 *
 * Used by every outbound provider call (DaData suggest, DaData reverse,
 * TomTom routing) so they all honour the caller's cancellation AND have a
 * hard upper bound on wait time.
 */
export function resolveFetchSignal(
  options?: GeoProviderRequestOptions,
): AbortSignal | undefined {
  const signals: AbortSignal[] = [];

  if (options?.signal) {
    signals.push(options.signal);
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (
    timeoutMs > 0 &&
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    signals.push(AbortSignal.timeout(timeoutMs));
  }

  if (signals.length === 0) {
    return undefined;
  }

  if (signals.length === 1) {
    return signals[0];
  }

  return AbortSignal.any(signals);
}

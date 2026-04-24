"use client";

import { useCallback, useEffect, useRef } from "react";

type RaceHandlers<T> = {
  onSuccess: (result: T) => void;
  onError?: (error: unknown) => void;
  /** Called in finally. `isLatest` is true when this run is still the active
   *  one (not superseded by a later run). Use it to toggle loading flags
   *  without stomping on a newer in-flight request. */
  onSettled?: (isLatest: boolean) => void;
};

/**
 * Wraps the abort-previous + sequence-number guard pattern used whenever a
 * user action can fire repeatedly (typing → suggest, dragging → reverse,
 * confirming → quote). Each hook instance owns one AbortController slot and
 * one sequence counter. Aborts everything on unmount.
 *
 * Pattern: call `run((signal) => fetch(..., { signal }), handlers)`.
 * - Previous in-flight run is aborted before the new one starts.
 * - `onSuccess` / `onError` only fire when this call is still the latest.
 * - AbortError is swallowed silently; other errors go to `onError`.
 * - `onSettled(isLatest)` always fires; callers gate loading state on isLatest.
 */
export function useRaceGuardedAsync() {
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  return useCallback(
    async <T>(
      task: (signal: AbortSignal) => Promise<T>,
      handlers: RaceHandlers<T>,
    ): Promise<void> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = ++seqRef.current;

      try {
        const result = await task(controller.signal);
        if (seq !== seqRef.current) return;
        handlers.onSuccess(result);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        if (seq !== seqRef.current) return;
        handlers.onError?.(error);
      } finally {
        handlers.onSettled?.(seq === seqRef.current);
      }
    },
    [],
  );
}

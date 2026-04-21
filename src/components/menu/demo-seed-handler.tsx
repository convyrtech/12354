"use client";

import { useEffect } from "react";
import { writeJson } from "@/lib/storage";
import { MOCK_ANDREY } from "@/lib/waiter/mock-user-andrey";

const STORAGE_KEY = "theraki_fake_auth";

// Mounts once on /menu. If ?demo=andrey is present:
//   1. Write MOCK_ANDREY into theraki_fake_auth (idempotent — same object)
//   2. Strip the query param via history.replaceState (no reload, so we
//      don't disrupt scroll position / dev HMR)
//   3. Trigger a storage event so useFakeAuth subscribers in other tabs
//      pick up the change
// Silent no-op outside the browser or when ?demo is absent.
export function DemoSeedHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const demo = url.searchParams.get("demo");
    if (demo !== "andrey") return;

    try {
      writeJson(STORAGE_KEY, MOCK_ANDREY);
      url.searchParams.delete("demo");
      window.history.replaceState({}, "", url.toString());
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: JSON.stringify(MOCK_ANDREY),
        }),
      );
    } catch {
      /* storage unavailable — silent */
    }
  }, []);

  return null;
}

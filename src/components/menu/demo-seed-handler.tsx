"use client";

import { useEffect } from "react";
import { FAKE_AUTH_STORAGE_KEY } from "@/hooks/use-fake-auth";
import { writeJson } from "@/lib/storage";
import { MOCK_ANDREY } from "@/lib/waiter/mock-user-andrey";

export function DemoSeedHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("demo") !== "andrey") return;

    try {
      writeJson(FAKE_AUTH_STORAGE_KEY, MOCK_ANDREY);
      url.searchParams.delete("demo");
      window.history.replaceState({}, "", url.toString());
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: FAKE_AUTH_STORAGE_KEY,
          newValue: JSON.stringify(MOCK_ANDREY),
        }),
      );
    } catch {
      /* storage unavailable — silent */
    }
  }, []);

  return null;
}

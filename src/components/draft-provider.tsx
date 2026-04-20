"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applyDraftPatch,
  createDraft,
  createInvestorDemoDraft,
  hydrateStoredDraft,
  type DraftPatch,
  type OrderStage,
  type OrderDraftContext,
} from "@/lib/draft";
import type { RouteMode } from "@/lib/route-mode";
import { readJson, writeJson } from "@/lib/storage";

const PUBLIC_STORAGE_KEY = "raki_draft";
const DEMO_STORAGE_KEY = "raki_demo_draft";

type DraftContextValue = {
  draft: OrderDraftContext;
  hydrated: boolean;
  patchDraft: (patch: DraftPatch) => void;
  resetDraft: (patch?: DraftPatch) => void;
};

const DraftContext = createContext<DraftContextValue | null>(null);

function getDemoOrderStage(pathname: string): OrderStage {
  if (pathname.startsWith("/delivery")) return "context";
  if (pathname.startsWith("/product/")) return "product";
  if (pathname.startsWith("/cart")) return "cart";
  if (pathname.startsWith("/checkout")) return "checkout";
  if (pathname.startsWith("/menu")) return "menu";
  return "context";
}

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) {
    throw new Error("useDraft must be used within a DraftProvider");
  }
  return ctx;
}

export function DraftProvider({
  children,
  mode,
}: {
  children: ReactNode;
  mode: RouteMode;
}) {
  const [draft, setDraft] = useState<OrderDraftContext>(() => createDraft());
  const [isHydrated, setIsHydrated] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const key = mode === "demo" ? DEMO_STORAGE_KEY : PUBLIC_STORAGE_KEY;
    const parsed = readJson<unknown>(key);

    if (parsed != null) {
      setDraft(hydrateStoredDraft(parsed));
    } else if (mode === "demo") {
      const url = new URL(window.location.href);
      const seeded = createInvestorDemoDraft({
        orderStage: getDemoOrderStage(url.pathname),
      });
      setDraft(seeded);
      writeJson(key, seeded);
    } else {
      setDraft(createDraft());
    }

    setIsHydrated(true);
  }, [mode]);

  useEffect(() => {
    if (!hydrated.current) return;
    writeJson(mode === "demo" ? DEMO_STORAGE_KEY : PUBLIC_STORAGE_KEY, draft);
  }, [draft, mode]);

  const patchDraft = useCallback((patch: DraftPatch) => {
    setDraft((prev) => applyDraftPatch(prev, patch));
  }, []);

  const resetDraft = useCallback((patch?: DraftPatch) => {
    setDraft(createDraft(patch));
  }, []);

  return (
    <DraftContext.Provider value={{ draft, hydrated: isHydrated, patchDraft, resetDraft }}>
      {children}
    </DraftContext.Provider>
  );
}

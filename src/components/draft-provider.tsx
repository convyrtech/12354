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

    try {
      const url = new URL(window.location.href);
      if (mode === "demo") {
        const storedDemo = localStorage.getItem(DEMO_STORAGE_KEY);
        if (storedDemo) {
          const parsed = JSON.parse(storedDemo);
          setDraft(hydrateStoredDraft(parsed));
        } else {
          const seeded = createInvestorDemoDraft({
            orderStage: getDemoOrderStage(url.pathname),
          });
          setDraft(seeded);
          localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seeded));
        }
      } else {
        const stored = localStorage.getItem(PUBLIC_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setDraft(hydrateStoredDraft(parsed));
        } else {
          setDraft(createDraft());
        }
      }
    } catch {
      // ignore corrupt storage
    }
    setIsHydrated(true);
  }, [mode]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(mode === "demo" ? DEMO_STORAGE_KEY : PUBLIC_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // storage full or unavailable
    }
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

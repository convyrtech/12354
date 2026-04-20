"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_CITY_ID,
  getCity,
  getDefaultCity,
  isValidCityId,
  type CityConfig,
  type CityId,
} from "@/lib/cities/cities-config";
import { applyCitySwitchToDraft } from "@/lib/cities/apply-city-switch-to-draft";
import { useDraft } from "@/components/draft-provider";
import { readString, writeString } from "@/lib/storage";

const STORAGE_KEY = "theraki_city";

type CityContextValue = {
  city: CityConfig;
  cityId: CityId;
  hydrated: boolean;
  setCity: (cityId: string) => { accepted: boolean; reason: string };
};

const CityContext = createContext<CityContextValue | null>(null);

export function useCity(): CityContextValue {
  const ctx = useContext(CityContext);
  if (!ctx) {
    throw new Error("useCity must be used within a CityProvider");
  }
  return ctx;
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [cityId, setCityId] = useState<CityId>(DEFAULT_CITY_ID);
  const [hydrated, setHydrated] = useState(false);
  const { draft, patchDraft } = useDraft();
  const draftRef = useRef(draft);
  const patchDraftRef = useRef(patchDraft);

  useEffect(() => {
    draftRef.current = draft;
    patchDraftRef.current = patchDraft;
  });

  useEffect(() => {
    const stored = readString(STORAGE_KEY, isValidCityId);
    if (stored && isValidCityId(stored)) setCityId(stored);
    setHydrated(true);
  }, []);

  const setCity = useCallback(
    (nextCityId: string): { accepted: boolean; reason: string } => {
      const target = getCity(nextCityId);
      if (!target) {
        return { accepted: false, reason: "unknown-city" };
      }

      if (target.status === "coming-soon") {
        return { accepted: false, reason: "coming-soon" };
      }

      setCityId((prev) => {
        if (prev === nextCityId) return prev;
        const outcome = applyCitySwitchToDraft(draftRef.current, nextCityId);
        if (outcome.patch) {
          patchDraftRef.current(outcome.patch);
        }
        writeString(STORAGE_KEY, nextCityId);
        return nextCityId as CityId;
      });

      return { accepted: true, reason: "ok" };
    },
    [],
  );

  const city = useMemo(() => getCity(cityId) ?? getDefaultCity(), [cityId]);

  const value = useMemo<CityContextValue>(
    () => ({ city, cityId, hydrated, setCity }),
    [city, cityId, hydrated, setCity],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { CityId } from "@/lib/cities/cities-config";
import { readJson, removeKey, writeJson } from "@/lib/storage";
import type { HistoricalOrder } from "@/lib/waiter/waiter-types";

const STORAGE_KEY = "theraki_fake_auth";

export type FakeAuthState = {
  isAuthenticated: boolean;
  phone: string | null;
  name: string | null;
  bonusBalance: number;
  orderHistory?: HistoricalOrder[];
  paymentPreference?: "online" | "cash";
  preferredCity?: CityId;
};

const DEFAULT: FakeAuthState = {
  isAuthenticated: false,
  phone: null,
  name: null,
  bonusBalance: 0,
};

function readStorage(): FakeAuthState {
  const parsed = readJson<Partial<FakeAuthState>>(STORAGE_KEY);
  if (!parsed || typeof parsed !== "object") return DEFAULT;
  return {
    isAuthenticated: Boolean(parsed.isAuthenticated),
    phone: parsed.phone ?? null,
    name: parsed.name ?? null,
    bonusBalance:
      typeof parsed.bonusBalance === "number" ? parsed.bonusBalance : 0,
    orderHistory: Array.isArray(parsed.orderHistory)
      ? parsed.orderHistory
      : undefined,
    paymentPreference:
      parsed.paymentPreference === "online" || parsed.paymentPreference === "cash"
        ? parsed.paymentPreference
        : undefined,
    preferredCity:
      typeof parsed.preferredCity === "string"
        ? (parsed.preferredCity as CityId)
        : undefined,
  };
}

function writeStorage(next: FakeAuthState) {
  writeJson(STORAGE_KEY, next);
}

function clearStorage() {
  removeKey(STORAGE_KEY);
}

export function useFakeAuth() {
  const [state, setState] = useState<FakeAuthState>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readStorage());
    setHydrated(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setState(readStorage());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback((phone: string) => {
    const existing = readStorage();
    const next: FakeAuthState =
      existing.phone === phone && existing.isAuthenticated
        ? { ...existing, isAuthenticated: true }
        : { ...DEFAULT, isAuthenticated: true, phone };
    setState(next);
    writeStorage(next);
  }, []);

  const updateName = useCallback((name: string) => {
    const current = readStorage();
    const next: FakeAuthState = { ...current, name };
    setState(next);
    writeStorage(next);
  }, []);

  const updateBonus = useCallback((bonusBalance: number) => {
    const current = readStorage();
    const next: FakeAuthState = { ...current, bonusBalance };
    setState(next);
    writeStorage(next);
  }, []);

  const logout = useCallback(() => {
    clearStorage();
    setState(DEFAULT);
  }, []);

  const lookup = useCallback((phone: string): FakeAuthState | null => {
    const current = readStorage();
    if (current.phone && current.phone === phone) return current;
    return null;
  }, []);

  return { state, hydrated, login, updateName, updateBonus, logout, lookup };
}

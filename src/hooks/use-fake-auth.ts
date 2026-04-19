"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "theraki_fake_auth";

export type FakeAuthState = {
  isAuthenticated: boolean;
  phone: string | null;
  name: string | null;
  bonusBalance: number;
};

const DEFAULT: FakeAuthState = {
  isAuthenticated: false,
  phone: null,
  name: null,
  bonusBalance: 0,
};

function readStorage(): FakeAuthState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<FakeAuthState>;
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      phone: parsed.phone ?? null,
      name: parsed.name ?? null,
      bonusBalance:
        typeof parsed.bonusBalance === "number" ? parsed.bonusBalance : 0,
    };
  } catch {
    return DEFAULT;
  }
}

function writeStorage(next: FakeAuthState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / unavailability */
  }
}

function clearStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
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

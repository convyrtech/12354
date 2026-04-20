// SSR-safe localStorage helpers. All failures (missing DOM, quota, disabled
// storage in private mode) are swallowed — callers always get a sensible
// fallback and never throw during hydration.

export function readString(
  key: string,
  validate?: (value: string) => boolean,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    if (validate && !validate(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export function readJson<T>(
  key: string,
  validate?: (value: unknown) => value is T,
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

export function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

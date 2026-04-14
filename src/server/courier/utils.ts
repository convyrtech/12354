export function nowIso() {
  return new Date().toISOString();
}

export function createCourierEntityId(prefix: string) {
  const root =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);

  return `${prefix}_${root}`;
}

import type { Courier, CourierRepositories } from "@/server/courier/types";
import { createFileCourierRepositories } from "./file-store";
import { createMemoryCourierRepositories } from "./memory-store";

const DEMO_CREATED_AT = "2026-03-28T00:00:00.000Z";

function buildDemoCouriers(): Courier[] {
  return [
    {
      id: "courier_aleksei",
      displayName: "Алексей",
      phone: "+7 999 000-00-01",
      status: "available",
      vehicleType: "car",
      isActive: true,
      createdAt: DEMO_CREATED_AT,
      updatedAt: DEMO_CREATED_AT,
    },
    {
      id: "courier_maksim",
      displayName: "Максим",
      phone: "+7 999 000-00-02",
      status: "busy",
      vehicleType: "scooter",
      isActive: true,
      createdAt: DEMO_CREATED_AT,
      updatedAt: DEMO_CREATED_AT,
    },
    {
      id: "courier_nikita",
      displayName: "Никита",
      phone: "+7 999 000-00-03",
      status: "paused",
      vehicleType: "bike",
      isActive: true,
      createdAt: DEMO_CREATED_AT,
      updatedAt: DEMO_CREATED_AT,
    },
  ];
}

async function ensureCourierDemoSeed(repositories: CourierRepositories) {
  if (process.env.NODE_ENV === "production") {
    return repositories;
  }

  const existing = await repositories.couriers.list({ includeInactive: true });

  if (existing.length > 0) {
    return repositories;
  }

  const demoCouriers = buildDemoCouriers();

  for (const courier of demoCouriers) {
    await repositories.couriers.upsert(courier);
  }

  return repositories;
}

function getCourierStorageMode() {
  if (process.env.COURIER_STORAGE_MODE === "memory") {
    return "memory" as const;
  }

  if (process.env.COURIER_STORAGE_MODE === "file") {
    return "file" as const;
  }

  if (process.env.VERCEL === "1") {
    return "memory" as const;
  }

  return "file" as const;
}

export async function getCourierRepositories() {
  const repositories =
    getCourierStorageMode() === "memory"
      ? createMemoryCourierRepositories()
      : await createFileCourierRepositories();
  await ensureCourierDemoSeed(repositories);
  return repositories;
}

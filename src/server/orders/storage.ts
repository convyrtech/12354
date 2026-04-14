import "server-only";

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StoredOrderRecord } from "@/server/orders/types";

const ORDERS_DIR = path.join(process.cwd(), "data", "orders");

function getOrderStorageMode() {
  if (process.env.ORDER_STORAGE_MODE === "memory") {
    return "memory" as const;
  }

  if (process.env.ORDER_STORAGE_MODE === "file") {
    return "file" as const;
  }

  if (process.env.VERCEL === "1") {
    return "memory" as const;
  }

  return "file" as const;
}

function getMemoryOrdersStore() {
  const root = globalThis as typeof globalThis & {
    __rakiOrderMemoryStore?: Map<string, StoredOrderRecord>;
  };

  if (!root.__rakiOrderMemoryStore) {
    root.__rakiOrderMemoryStore = new Map<string, StoredOrderRecord>();
  }

  return root.__rakiOrderMemoryStore;
}

function hydrateStoredOrderRecord(record: StoredOrderRecord): StoredOrderRecord {
  const submission = record.submission ?? {
    channel: "local_queue" as const,
    status: "accepted" as const,
    destinationLabel: "Операционный слой The Raki",
    externalReference: null,
    correlationId: null,
    lastError: null,
  };

  return {
    ...record,
    submission,
    providerSync: record.providerSync ?? null,
    summary: {
      ...record.summary,
      handoffLabel: record.summary?.handoffLabel ?? submission.destinationLabel,
      handoffStatus: record.summary?.handoffStatus ?? submission.status,
      externalReference: record.summary?.externalReference ?? submission.externalReference,
      trackingHref: record.summary?.trackingHref ?? null,
      opsHref: record.summary?.opsHref ?? "/ops/orders",
    },
  };
}

async function ensureOrdersDir() {
  await mkdir(ORDERS_DIR, { recursive: true });
}

function getOrderFilename(record: Pick<StoredOrderRecord, "createdAt" | "reference">) {
  const safeTimestamp = record.createdAt.replace(/[:.]/g, "-");
  return `${safeTimestamp}__${record.reference}.json`;
}

async function readOrderFile(filename: string) {
  const fullPath = path.join(ORDERS_DIR, filename);
  const raw = await readFile(fullPath, "utf8");
  return hydrateStoredOrderRecord(JSON.parse(raw) as StoredOrderRecord);
}

async function listMemoryOrders(limit = 50) {
  const store = getMemoryOrdersStore();
  return Array.from(store.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((record) => hydrateStoredOrderRecord(record));
}

export async function listStoredOrders(limit = 50) {
  if (getOrderStorageMode() === "memory") {
    return listMemoryOrders(limit);
  }

  await ensureOrdersDir();
  const filenames = (await readdir(ORDERS_DIR))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, limit);

  const records = await Promise.all(
    filenames.map(async (filename) => {
      try {
        return await readOrderFile(filename);
      } catch {
        return null;
      }
    }),
  );

  return records.filter((record): record is StoredOrderRecord => Boolean(record));
}

export async function findStoredOrderByIdempotencyKey(idempotencyKey: string) {
  if (!idempotencyKey.trim()) {
    return null;
  }

  const orders = await listStoredOrders(200);
  return orders.find((order) => order.idempotencyKey === idempotencyKey) ?? null;
}

export async function persistStoredOrder(record: StoredOrderRecord) {
  if (getOrderStorageMode() === "memory") {
    const hydrated = hydrateStoredOrderRecord(record);
    getMemoryOrdersStore().set(record.reference, hydrated);
    return hydrated;
  }

  await ensureOrdersDir();
  const filename = getOrderFilename(record);
  const fullPath = path.join(ORDERS_DIR, filename);
  await writeFile(fullPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
}
